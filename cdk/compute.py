from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_iam as iam,
    Stack,
    aws_logs as logs,
    aws_ecs as ecs,
    aws_ecr_assets as ecr_assets,
)
from constructs import Construct
import time

class ComputeStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, storage_stack, network_stack, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Create Fargate Definition
        taskdef_evaluator = ecs.FargateTaskDefinition(self, 
            f"{self.stack_name}-evaluator-taskdef",
            cpu=4096,  
            memory_limit_mib=8192
        )
        self.taskdef_evaluator = taskdef_evaluator
        taskdef_evaluator.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Log Group for ECS Task
        evaluator_log_group = logs.LogGroup(self, f"{self.stack_name}-ecs-evaluator-taskdef-loggroup", 
            log_group_name=f"/aws/ecs/{self.stack_name}-ecs-evaluator-taskdef-loggroup",
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Add container to the task definition
        container = taskdef_evaluator.add_container("Container",
            image=ecs.ContainerImage.from_asset(
                "./lambda-ecs/evaluator",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            logging=ecs.LogDriver.aws_logs(stream_prefix=self.stack_name, log_group=evaluator_log_group),
        )
        container.add_to_execution_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["logs:CreateLogGroup"],
                resources=[f"arn:aws:logs:*:{self.account}:log-group:*"]
            )
        )
        container.add_to_execution_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["logs:CreateLogStream", "logs:PutLogEvents"],
                resources=[f"arn:aws:logs:*:{self.account}:log-group:*:log-stream:*"]
            )
        )
        taskdef_evaluator.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:PutItem", 
                    "dynamodb:UpdateItem",
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:GetItem",
                ],
                resources=[
                    storage_stack.ddbtbl_evaluation_report.table_arn,
                    storage_stack.ddbtbl_evaluation_report_questions.table_arn,
                    storage_stack.ddbtbl_scenario_questions.table_arn
                ]
            )
        )
        taskdef_evaluator.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
                resources=[
                    f"arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0", 
                    f"arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0", 
                    f"arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0", 
                    f"arn:aws:bedrock:{self.region}:{self.account}:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",                    
                ]
            )
        )

        # Create ECS Cluster
        cluster = ecs.Cluster(self, f"{self.stack_name}-ecs-cluster", 
            cluster_name=f"{self.stack_name}-ecs-cluster", 
            vpc=network_stack.vpc, 
            container_insights_v2=ecs.ContainerInsights.ENABLED
        )
        self.cluster = cluster
        cluster.apply_removal_policy(RemovalPolicy.DESTROY)
        
        
