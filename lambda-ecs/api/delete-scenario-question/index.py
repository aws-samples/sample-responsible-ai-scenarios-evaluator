import json
import os
import boto3

dynamodb = boto3.resource('dynamodb')
ddbtbl_scenario_questions_name = os.environ.get("DDBTBL_SCENARIO_QUESTIONS", "")
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
        # Extract parameters from query string
        query_params = event.get('queryStringParameters', {}) or {}
        scenario_id = query_params.get('scenario_id')
        question_id = query_params.get('question_id')
        
        if not scenario_id or not question_id:
            return returnMessage("scenario_id and question_id are required as query parameters", 400)
        
        # Delete the question
        ddbtbl_scenario_questions.delete_item(
            Key={
                'question_id': question_id,
                'scenario_id': scenario_id
            }
        )
        
        return returnMessage(f"Question {question_id} deleted successfully")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return returnMessage(f"Error deleting question: {str(e)}", 500)