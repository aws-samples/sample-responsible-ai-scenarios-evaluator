import json
import os
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
ddbtbl_scenarios_name = os.environ.get("DDBTBL_SCENARIOS", "")
ddbtbl_scenario_questions_name = os.environ.get("DDBTBL_SCENARIO_QUESTIONS", "")
ddbtbl_scenarios = dynamodb.Table(ddbtbl_scenarios_name)
ddbtbl_scenario_questions = dynamodb.Table(ddbtbl_scenario_questions_name)

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def returnMessage(data, status_code=200):
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    }
    return {
        'statusCode': status_code,
        'headers': cors_headers,
        'body': json.dumps(data, default=decimal_default)
    }

def lambda_handler(event, context):
    try:
        # Extract scenario_id from query parameters
        scenario_id = None
        if 'queryStringParameters' in event and event['queryStringParameters']:
            scenario_id = event['queryStringParameters'].get('scenario_id')
        
        if not scenario_id:
            return returnMessage({"message": "scenario_id is required as a query parameter"}, 400)
        
        # Get scenario details
        scenario_response = ddbtbl_scenarios.get_item(
            Key={'scenario_id': scenario_id}
        )
        
        scenario = scenario_response.get('Item', {})
        
        # Get scenario questions
        questions_response = ddbtbl_scenario_questions.scan(
            FilterExpression=Key('scenario_id').eq(scenario_id)
        )
        
        questions = questions_response.get('Items', [])
        
        return returnMessage({
            'message': 'Scenario details retrieved successfully',
            'scenario': {
                'id': scenario.get('scenario_id', ''),
                'name': scenario.get('scenario_name', ''),
                'description': scenario.get('scenario_description', ''),
                'questionsPerCategory': scenario.get('questions_per_category', 0),
                'created_datetime': scenario.get('created_datetime', '')
            },
            'questions': [
                {
                    'id': q.get('question_id', ''),
                    'category': q.get('category', ''),
                    'question': q.get('question', '')
                } for q in questions
            ]
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return returnMessage({"message": f"Error retrieving scenario: {str(e)}"}, 500)