from aws_cdk import Stack, aws_dynamodb as dynamodb, RemovalPolicy, CfnOutput
from constructs import Construct

class StorageStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Create DynamoDB table for evaluation report
        table_name = f"{self.stack_name}-evaluation-report"
        ddbtbl_evaluation_report = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            time_to_live_attribute="ttl_timestamp",
            removal_policy=RemovalPolicy.DESTROY
        )
        self.ddbtbl_evaluation_report = ddbtbl_evaluation_report
        CfnOutput(self, "DynamoDB table for evaluation report", value=ddbtbl_evaluation_report.table_name)

        # Create DynamoDB table for evaluation report
        table_name = f"{self.stack_name}-evaluation-report-questions"
        ddbtbl_evaluation_report_questions = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="question_id", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="report_id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            time_to_live_attribute="ttl_timestamp",
            removal_policy=RemovalPolicy.DESTROY
        )
        self.ddbtbl_evaluation_report_questions = ddbtbl_evaluation_report_questions
        CfnOutput(self, "DynamoDB table for evaluation report questions", value=ddbtbl_evaluation_report_questions.table_name)

        # Create DynamoDB table for scenarios
        table_name = f"{self.stack_name}-scenarios"
        ddbtbl_scenarios = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="scenario_id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            time_to_live_attribute="ttl_timestamp",
            removal_policy=RemovalPolicy.DESTROY
        )
        self.ddbtbl_scenarios = ddbtbl_scenarios
        CfnOutput(self, "DynamoDB table for scenarios", value=ddbtbl_scenarios.table_name)

        # Create DynamoDB table for scenario questions
        table_name = f"{self.stack_name}-scenario-questions"
        ddbtbl_scenario_questions = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="question_id", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="scenario_id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            time_to_live_attribute="ttl_timestamp",
            removal_policy=RemovalPolicy.DESTROY
        )
        self.ddbtbl_scenario_questions = ddbtbl_scenario_questions
        CfnOutput(self, "DynamoDB table for scenario questions", value=ddbtbl_scenario_questions.table_name)

