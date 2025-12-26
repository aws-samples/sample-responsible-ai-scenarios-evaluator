import json
import os
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
ddbtbl_scenarios_name = os.environ.get("DDBTBL_SCENARIOS", "")
ddbtbl_scenario_questions_name = os.environ.get("DDBTBL_SCENARIO_QUESTIONS", "")
ddbtbl_scenarios = dynamodb.Table(ddbtbl_scenarios_name)
ddbtbl_scenario_questions = dynamodb.Table(ddbtbl_scenario_questions_name)

def returnMessage(msg, status_code=200):
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    }
    return {
        'statusCode': status_code,
        'headers': cors_headers,
        'body': json.dumps({
            'message': msg
        })         
    }

def lambda_handler(event, context):
    try:
        # Extract scenario_id from query parameters
        scenario_id = None
        if 'queryStringParameters' in event and event['queryStringParameters']:
            scenario_id = event['queryStringParameters'].get('scenario_id')
        
        if not scenario_id:
            return returnMessage("scenario_id is required as a query parameter", 400)
        
        # Delete all questions associated with this scenario
        # Scan the table to find all questions with matching scenario_id
        questions_response = ddbtbl_scenario_questions.scan(
            FilterExpression=Key('scenario_id').eq(scenario_id)
        )
        
        # Delete each question
        deleted_questions_count = 0
        if 'Items' in questions_response:
            for question in questions_response['Items']:
                ddbtbl_scenario_questions.delete_item(
                    Key={
                        'question_id': question['question_id'],
                        'scenario_id': question['scenario_id']
                    }
                )
                deleted_questions_count += 1
        
        # Delete the scenario from scenarios table
        ddbtbl_scenarios.delete_item(
            Key={'scenario_id': scenario_id}
        )
        
        return returnMessage(f"Scenario {scenario_id} deleted successfully. Removed {deleted_questions_count} associated questions.")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return returnMessage(f"Error deleting scenario: {str(e)}", 500)