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
        if 'body' not in event:
            return returnMessage("No body found in the event", 400)
        
        body = json.loads(event['body'])
        
        # Extract required fields
        scenario_id = body.get('scenario_id', '').strip()
        question_id = body.get('question_id', '').strip()
        category = body.get('category', '').strip()
        question = body.get('question', '').strip()
        
        if not all([scenario_id, question_id, category, question]):
            return returnMessage("scenario_id, question_id, category, and question are required", 400)
        
        # Update the question
        ddbtbl_scenario_questions.update_item(
            Key={
                'question_id': question_id,
                'scenario_id': scenario_id
            },
            UpdateExpression='SET category = :category, question = :question',
            ExpressionAttributeValues={
                ':category': category,
                ':question': question
            }
        )
        
        return returnMessage(f"Question {question_id} updated successfully")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return returnMessage(f"Error updating question: {str(e)}", 500)