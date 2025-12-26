import json
import os
import boto3
from decimal import Decimal
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
ddbtbl_evaluation_report_questions = dynamodb.Table(ddbtbl_evaluation_report_questions_name)

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
        }, default=decimal_default)         
    }

def get_questions_for_report(report_id):
    """Retrieve all questions for a specific report"""
    try:
        response = ddbtbl_evaluation_report_questions.scan(
            FilterExpression=Attr('report_id').eq(str(report_id)) & ~Attr('question_id').eq('counter')
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"Error retrieving questions for report {report_id}: {str(e)}")
        return []

def recalculate_report_scores(report_id):
    """Recalculate scores based on 1-5 scoring system"""
    questions = get_questions_for_report(report_id)
    
    # Group questions by category
    categories = {}
    for question in questions:
        category = question.get('category', '')
        if category not in categories:
            categories[category] = []
        categories[category].append(question)
    
    score_breakdown = {}
    category_scores = []
    
    for category, question_list in categories.items():
        # Calculate average score for ALL questions in this category (PENDING and EVALUATED)
        if question_list:
            # Average of all scores (1-5), including PENDING questions with default score of 1
            total_score = sum(float(q.get('score', 1)) for q in question_list)
            category_score = total_score / len(question_list)
        else:
            # Default score for empty categories
            category_score = 1.0
        
        score_breakdown[category] = str(category_score)
        category_scores.append(category_score)
    
    # Overall score = average of all category scores
    overall_score = sum(category_scores) / len(category_scores) if category_scores else 1.0
    
    # Update evaluation_report table
    try:
        ddbtbl_evaluation_report.update_item(
            Key={'id': str(report_id)},
            UpdateExpression='SET score = :score, score_breakdown = :breakdown',
            ExpressionAttributeValues={
                ':score': str(overall_score),
                ':breakdown': score_breakdown
            }
        )
        print(f"Updated scores for report {report_id}: overall={overall_score}, breakdown={score_breakdown}")
    except Exception as e:
        print(f"Error updating report scores: {str(e)}")
        raise e

def lambda_handler(event, context):
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return returnMessage("OK")
        
        body = json.loads(event['body'])
        question_id = body.get('question_id')
        report_id = body.get('report_id')
        score = body.get('score')
        
        # Validate input
        if not question_id or not report_id or score is None:
            return returnMessage("Missing required fields: question_id, report_id, score", 400)
        
        # Validate score range
        try:
            score_value = int(score)
            if score_value < 1 or score_value > 5:
                return returnMessage("Invalid score value. Must be an integer between 1 and 5", 400)
        except (ValueError, TypeError):
            return returnMessage("Invalid score value. Must be an integer between 1 and 5", 400)
        
        # Update the question evaluation with score and set status to EVALUATED
        ddbtbl_evaluation_report_questions.update_item(
            Key={'question_id': question_id, 'report_id': str(report_id)},
            UpdateExpression='SET human_evaluation = :eval, score = :score',
            ExpressionAttributeValues={
                ':eval': 'EVALUATED',
                ':score': score_value
            }
        )
        
        # Recalculate scores for the report
        recalculate_report_scores(report_id)
        
        return returnMessage({
            "success": True,
            "question_id": question_id,
            "report_id": report_id,
            "score": score_value,
            "human_evaluation": "EVALUATED"
        })
        
    except Exception as e:
        print(f"Error in update-question-evaluation: {str(e)}")
        return returnMessage(f"Internal server error: {str(e)}", 500)