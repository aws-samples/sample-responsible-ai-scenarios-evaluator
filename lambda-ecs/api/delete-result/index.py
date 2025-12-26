import json
import os
import boto3
from boto3.dynamodb.conditions import Attr
from decimal import Decimal
from datetime import datetime

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

dynamodb = boto3.resource('dynamodb')
ddbtbl_evaluation_report_name = os.environ.get("DDBTBL_EVALUATION_REPORT", "")
ddbtbl_evaluation_report_questions_name = os.environ.get("DDBTBL_EVALUATION_REPORT_QUESTIONS", "")
ddbtbl_evaluation_report = dynamodb.Table(ddbtbl_evaluation_report_name)
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
        report_id = body.get('report_id')
        
        if not report_id:
            return returnMessage(400, 'report_id is required')
        
        # Delete from evaluation-report table
        try:
            ddbtbl_evaluation_report.delete_item(
                Key={'id': report_id}
            )
            print(f"Deleted report {report_id} from evaluation-report table")
        except Exception as e:
            print(f"Error deleting from evaluation-report table: {str(e)}")
            # Continue with questions deletion even if report deletion fails
        
        # Delete all questions for this report from evaluation-report-questions table
        try:
            # First, scan to find all questions for this report
            response = ddbtbl_evaluation_report_questions.scan(
                FilterExpression=Attr('report_id').eq(report_id)
            )
            
            questions_to_delete = response.get('Items', [])
            
            # Delete each question
            for question in questions_to_delete:
                ddbtbl_evaluation_report_questions.delete_item(
                    Key={
                        'question_id': question['question_id'],
                        'report_id': question['report_id']
                    }
                )
            
            print(f"Deleted {len(questions_to_delete)} questions for report {report_id}")
            
        except Exception as e:
            print(f"Error deleting questions: {str(e)}")
            return returnMessage(500, f'Error deleting questions: {str(e)}')
        
        return returnMessage(200, f'Successfully deleted report {report_id} and all associated questions')
        
    except Exception as e:
        print(f"Error deleting result: {str(e)}")
        return returnMessage(500, f'Error deleting result: {str(e)}')