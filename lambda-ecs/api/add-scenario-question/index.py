import json
import os
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
ddbtbl_scenario_questions_name = os.environ.get("DDBTBL_SCENARIO_QUESTIONS", "")
ddbtbl_scenario_questions = dynamodb.Table(ddbtbl_scenario_questions_name)

def get_next_question_id(table):
    # Increment the question counter atomically
    response = table.update_item(
        Key={'question_id': 'counter', 'scenario_id': 'counter'},  # Dedicated key for the counter
        UpdateExpression='ADD current_value :increment',
        ExpressionAttributeValues={':increment': Decimal(1)},
        ReturnValues='UPDATED_NEW'
    )
    # Return the new counter value
    return response['Attributes']['current_value']

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
        if 'body' not in event:
            return returnMessage("No body found in the event", 400)
        
        body = json.loads(event['body'])
        
        # Extract required fields
        scenario_id = body.get('scenario_id', '').strip()
        category = body.get('category', '').strip()
        question = body.get('question', '').strip()
        
        if not all([scenario_id, category, question]):
            return returnMessage("scenario_id, category, and question are required", 400)
        
        # Generate new question ID
        question_id = str(get_next_question_id(ddbtbl_scenario_questions))
        
        # Get current datetime
        current_datetime = datetime.now()
        formatted_datetime = current_datetime.strftime("%d-%b-%Y %I:%M:%S %p")
        
        # Add the new question
        ddbtbl_scenario_questions.put_item(
            Item={
                'question_id': question_id,
                'scenario_id': scenario_id,
                'category': category,
                'question': question,
                'created_datetime': formatted_datetime
            }
        )
        
        return returnMessage(f"Question {question_id} added successfully")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return returnMessage(f"Error adding question: {str(e)}", 500)