import json
import os
import boto3
from decimal import Decimal
from datetime import datetime

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

dynamodb = boto3.resource('dynamodb')
ddbtbl_evaluation_report_questions_name = os.environ.get("DDBTBL_EVALUATION_REPORT_QUESTIONS", "")
ddbtbl_evaluation_report_questions = dynamodb.Table(ddbtbl_evaluation_report_questions_name)

def returnMessage(statusCode, msg):
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    }
    return {
        'statusCode': statusCode,
        'headers': cors_headers,
        'body': json.dumps({
            'message': msg
        }, default=decimal_default)         
    }

def lambda_handler(event, context):
    try:
        # Parse the request body
        body = json.loads(event['body'])
        question_id = body.get('question_id')
        comments = body.get('comments', '')
        
        if not question_id:
            return returnMessage(400, 'question_id is required')
        
        report_id = body.get('report_id')
        if not report_id:
            return returnMessage(400, 'report_id is required')
        
        # Update the question record with comments
        response = ddbtbl_evaluation_report_questions.update_item(
            Key={
                'question_id': question_id,
                'report_id': report_id
            },
            UpdateExpression='SET comments = :comments, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':comments': comments,
                ':updated_at': datetime.utcnow().isoformat()
            },
            ReturnValues='UPDATED_NEW'
        )
        
        return returnMessage(200, 'Comments saved successfully')
        
    except Exception as e:
        print(f"Error saving evaluation comment: {str(e)}")
        return returnMessage(500, f'Error saving comments: {str(e)}')