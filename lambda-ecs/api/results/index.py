import json
import os
import boto3
from decimal import Decimal
from datetime import datetime
from boto3.dynamodb.conditions import Attr

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

dynamodb = boto3.resource('dynamodb')
ddbtbl_evaluation_report_name = os.environ.get("DDBTBL_EVALUATION_REPORT", "")
ddbtbl_evaluation_report_questions_name = os.environ.get("DDBTBL_EVALUATION_REPORT_QUESTIONS", "")
ddbtbl_evaluation_report = dynamodb.Table(ddbtbl_evaluation_report_name)
ddbtbl_evaluation_report_questions = dynamodb.Table(ddbtbl_evaluation_report_questions_name) if ddbtbl_evaluation_report_questions_name else None

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
        }, default=decimal_default)         
    }
    
def get_all_items(table):
    # Perform the initial scan
    response = table.scan(
        FilterExpression=~Attr('id').eq('counter')  # Exclude rows where id is 'counter'
    )
    data = response['Items']

    # Paginate through results if 'LastEvaluatedKey' is present
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression=~Attr('id').eq('counter'),
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        data.extend(response['Items'])
        
    return data

def get_questions_for_report(report_id):
    """Retrieve questions for a specific report from evaluation_report_questions table"""
    if not ddbtbl_evaluation_report_questions:
        return {}
    
    try:
        response = ddbtbl_evaluation_report_questions.scan(
            FilterExpression=Attr('report_id').eq(str(report_id)) & ~Attr('question_id').eq('counter')
        )
        questions = response.get('Items', [])
        
        # Group questions by category to match UI expectations
        prompt_pairs = {}
        for question in questions:
            category = question.get('category', '')
            if category not in prompt_pairs:
                prompt_pairs[category] = []
            
            prompt_pairs[category].append({
                'question_id': question.get('question_id'),
                'question': question.get('question', ''),
                'answer': question.get('answer', ''),
                'considerations': question.get('considerations', ''),
                'human_evaluation': question.get('human_evaluation', 'PENDING'),
                'score': question.get('score'),  # Include score field (1-5 or null if pending)
                'comments': question.get('comments', '')
            })
        
        return prompt_pairs
    except Exception as e:
        print(f"Error retrieving questions for report {report_id}: {str(e)}")
        return {}

def lambda_handler(event, context):
    reports = get_all_items(ddbtbl_evaluation_report)
    
    # Add promptPairs to each report from evaluation_report_questions table
    for report in reports:
        if report.get('score'):  # Only add questions for completed evaluations
            report['promptPairs'] = get_questions_for_report(report.get('id'))

    return returnMessage(reports)
