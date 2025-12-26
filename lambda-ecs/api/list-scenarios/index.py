import json
import os
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
ddbtbl_scenarios_name = os.environ.get("DDBTBL_SCENARIOS", "")
ddbtbl_scenarios = dynamodb.Table(ddbtbl_scenarios_name)

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
        # Scan all scenarios from the table, excluding the counter row
        response = ddbtbl_scenarios.scan(
            FilterExpression=~Attr('scenario_id').eq('counter')  # Exclude counter row
        )
        scenarios = response['Items']
        
        # Handle pagination if there are more items
        while 'LastEvaluatedKey' in response:
            response = ddbtbl_scenarios.scan(
                FilterExpression=~Attr('scenario_id').eq('counter'),  # Exclude counter row
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            scenarios.extend(response['Items'])
        
        # Transform the data to match UI expectations
        formatted_scenarios = []
        for scenario in scenarios:
            formatted_scenario = {
                'id': scenario.get('scenario_id', ''),
                'name': scenario.get('scenario_name', ''),
                'description': scenario.get('scenario_description', ''),
                'questionsPerCategory': scenario.get('questions_per_category', 0),
                'created_datetime': scenario.get('created_datetime', ''),
                'status': scenario.get('status', 'COMPLETED'),  # Default to COMPLETED for backward compatibility
                'error_message': scenario.get('error_message', '')
            }
            formatted_scenarios.append(formatted_scenario)
        
        # Sort by creation date (newest first)
        # Convert datetime string to datetime object for proper sorting
        from datetime import datetime
        
        def parse_datetime(dt_str):
            if not dt_str:
                return datetime.min
            
            try:
                # Try new ISO format first: "2024-09-28 14:30:45"
                return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            except (ValueError, TypeError):
                try:
                    # Fallback to old format: "28-Sep-2024 02:30:45 PM"
                    return datetime.strptime(dt_str, "%d-%b-%Y %I:%M:%S %p")
                except (ValueError, TypeError):
                    # Fallback for invalid dates
                    return datetime.min
        
        formatted_scenarios.sort(key=lambda x: parse_datetime(x.get('created_datetime', '')), reverse=True)
        
        return returnMessage({
            'message': 'Scenarios retrieved successfully',
            'scenarios': formatted_scenarios
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return returnMessage({
            'message': f"Error retrieving scenarios: {str(e)}"
        }, 500)