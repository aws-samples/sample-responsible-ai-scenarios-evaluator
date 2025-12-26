import json
import os
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
ddbtbl_evaluation_report_name = os.environ.get("DDBTBL_EVALUATION_REPORT", "")
ddbtbl_evaluation_report_questions_name = os.environ.get("DDBTBL_EVALUATION_REPORT_QUESTIONS", "")
ddbtbl_scenarios_name = os.environ.get("DDBTBL_SCENARIOS", "")
ddbtbl_scenario_questions_name = os.environ.get("DDBTBL_SCENARIO_QUESTIONS", "")
ddbtbl_evaluation_report = dynamodb.Table(ddbtbl_evaluation_report_name)
ddbtbl_scenarios = dynamodb.Table(ddbtbl_scenarios_name)
ddbtbl_scenario_questions = dynamodb.Table(ddbtbl_scenario_questions_name)

ecs_client = boto3.client('ecs')
ecs_cluster = os.environ.get("ECS_CLUSTER","")
ecs_task_definition = os.environ.get("ECS_TASK_DEFINITION","")
ecs_subnet = os.environ.get("ECS_SUBNET","")
ecs_security_group = os.environ.get("ECS_SECURITY_GROUP","")
ecs_container_name = os.environ.get("ECS_CONTAINER_NAME","")

# Define parameters for the ECS task
params = {
    'cluster': ecs_cluster,  
    'taskDefinition': ecs_task_definition,
    'launchType': 'FARGATE',
    'networkConfiguration': {
        'awsvpcConfiguration': {
            'subnets': [ecs_subnet],
            'securityGroups': [ecs_security_group],
            'assignPublicIp': 'ENABLED'
        }
    },
    'count': 1
}

def get_next_id(table):
    # Increment the counter atomically
    response = table.update_item(
        Key={'id': 'counter'},  # Dedicated key for the counter
        UpdateExpression='ADD current_value :increment',
        ExpressionAttributeValues={':increment': Decimal(1)},
        ReturnValues='UPDATED_NEW'
    )
    # Return the new counter value
    return response['Attributes']['current_value']

def create_item_with_auto_increment(table, data):
    current_datetime = datetime.now()
    formatted_datetime = current_datetime.strftime("%d-%b-%Y %I:%M:%S %p")  # e.g., "18-Feb-2025 11:56:00 PM"

    # Get the next auto-incremented ID
    new_id = str(get_next_id(table))
    
    # Add your data with the new ID
    table.put_item(
        Item={
            'id': new_id,
            'datetime': formatted_datetime,
            **data  # Merge additional attributes into the item
        }
    )
    print(f"Item created with ID: {new_id}")
    return new_id

def update_item_with_key(table, key, data):
    # Construct the UpdateExpression and ExpressionAttributeValues dynamically
    update_expression = "SET " + ", ".join(f"#{k} = :{k}" for k in data.keys())
    expression_attribute_names = {f"#{k}": k for k in data.keys()}
    expression_attribute_values = {f":{k}": v for k, v in data.items()}

    # Perform the update
    response = table.update_item(
        Key=key,
        UpdateExpression=update_expression,
        ExpressionAttributeNames=expression_attribute_names,
        ExpressionAttributeValues=expression_attribute_values,
        ReturnValues="UPDATED_NEW"
    )

def returnMessage(msg):
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    }
    return {
        'statusCode': 200,
        'headers': cors_headers,
        'body': json.dumps({
            'message': msg
        })         
    }

def lambda_handler(event, context):
    if 'body' in event:
        body = json.loads(event['body'])
        
        name = body["name"]
        description = body.get("description", "")
        endpoint = body.get("endpoint","")
        headers = body.get("headers", "")
        bodyParams = body.get("bodyParams","")
        inputPromptKey = body.get("inputPromptKey", "")
        outputResponseKey = body.get("outputResponseKey","")
        copiedReportID = body.get("copiedReportID", "")
        scenario_id = body.get("scenario_id", "")
        
        # Check scenario existence for re-evaluations
        if copiedReportID and scenario_id:
            print(f"Re-evaluation requested for scenario: {scenario_id}")
            try:
                scenario_check_response = ddbtbl_scenarios.get_item(
                    Key={'scenario_id': scenario_id}
                )
                if 'Item' not in scenario_check_response:
                    print(f"Scenario {scenario_id} not found, blocking re-evaluation")
                    cors_headers = {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
                    }
                    return {
                        'statusCode': 400,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'SCENARIO_NOT_FOUND',
                            'message': 'The scenario used in the original evaluation is no longer available. Please run a new evaluation with an available scenario.',
                            'scenario_id': scenario_id
                        })
                    }
                print(f"Scenario {scenario_id} exists, proceeding with re-evaluation")
            except Exception as e:
                print(f"Error checking scenario existence: {str(e)}")
                cors_headers = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
                }
                return {
                    'statusCode': 500,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'error': 'SCENARIO_CHECK_FAILED',
                        'message': 'Unable to verify scenario availability. Please try again.'
                    })
                }
        
        # Retrieve scenario details
        scenario_name = ""
        scenario_description = ""
        questions_per_category = 0
        
        if scenario_id:
            try:
                scenario_response = ddbtbl_scenarios.get_item(
                    Key={'scenario_id': scenario_id}
                )
                if 'Item' in scenario_response:
                    scenario_item = scenario_response['Item']
                    scenario_name = scenario_item.get('scenario_name', '')
                    scenario_description = scenario_item.get('scenario_description', '')
                    questions_per_category = scenario_item.get('questions_per_category', 0)
            except Exception as e:
                print(f"Error retrieving scenario details: {str(e)}")
                            
        report_id = create_item_with_auto_increment(ddbtbl_evaluation_report, 
            { 
                "name": name, 
                "description": description,
                "endpoint": endpoint, 
                "headers": headers, 
                "bodyParams": bodyParams,
                "inputPromptKey": inputPromptKey, 
                "outputResponseKey": outputResponseKey,
                "copiedReportID": copiedReportID,
                "scenario_id": scenario_id,
                "scenario_name": scenario_name,
                "scenario_description": scenario_description,
                "questions_per_category": questions_per_category
            }
        )
        
        response = ecs_client.run_task(**params,
            overrides={
                'containerOverrides': [
                    {
                        'name': ecs_container_name,
                        'environment' : [
                            { 'name': 'report_id', 'value': report_id },
                            { 'name': 'DDBTBL_EVALUATION_REPORT', 'value': ddbtbl_evaluation_report_name },
                            { 'name': 'DDBTBL_EVALUATION_REPORT_QUESTIONS', 'value': ddbtbl_evaluation_report_questions_name },
                            { 'name': 'DDBTBL_SCENARIO_QUESTIONS', 'value': ddbtbl_scenario_questions_name }
                        ]
                    }
                ]
            }    
        )
        return returnMessage("Evaluation started")
    else:
        return returnMessage("No body found in the event")