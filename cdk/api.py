from aws_cdk import (
    Duration,
    Stack,
    aws_ec2 as ec2,
    RemovalPolicy,
    CfnOutput,
    aws_lambda as _lambda,
    aws_iam as iam,
    aws_lambda_event_sources as lambda_event_sources,
    aws_apigateway as apigateway,
    aws_events_targets as targets,
    aws_events as events,
    Stack,
    aws_logs as logs,
    aws_ecs as ecs,
    aws_ecr_assets as ecr_assets,
    Fn,
    custom_resources as cr,
    aws_wafv2 as waf,
)
from constructs import Construct
import time

class APIStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, storage_stack, webapphosting_stack, compute_stack, network_stack, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Create Lambda Layer
        layer_lambda = _lambda.LayerVersion(self, f"{self.stack_name}-layer",
            removal_policy=RemovalPolicy.DESTROY,
            code=_lambda.Code.from_asset("./layers"),
            compatible_architectures=[_lambda.Architecture.X86_64],
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_14]
        )

        # Create Lambda Permission
        role_lambda = iam.Role(self, 
            f"{self.stack_name}-lambda_role",
            role_name=f"{self.stack_name}-lambda_role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            inline_policies={
                "inline_policy_loggroup": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogGroup"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*"]
                        )
                    ]
                ),
                "inline_policy_logstream": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogStream", "logs:PutLogEvents"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*:log-stream:*"]
                        )
                    ]
                ),
                "inline_policy_readwrite_dynamodb": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "dynamodb:PutItem", 
                                "dynamodb:DeleteItem", 
                                "dynamodb:UpdateItem",
                                "dynamodb:Scan",
                                "dynamodb:Query",
                                "dynamodb:GetItem",
                            ],
                            resources=[
                                storage_stack.ddbtbl_evaluation_report.table_arn,
                                storage_stack.ddbtbl_evaluation_report_questions.table_arn,
                                storage_stack.ddbtbl_scenarios.table_arn,
                                storage_stack.ddbtbl_scenario_questions.table_arn
                            ]
                        )
                    ]
                ),
                "inline_policy_invoke_bedrock": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
                            resources=[
                                f"arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0", 
                                f"arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0", 
                                f"arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0", 
                                f"arn:aws:bedrock:{self.region}:{self.account}:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
                                f"arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-premier-v1:0", 
                                f"arn:aws:bedrock:us-east-2::foundation-model/amazon.nova-premier-v1:0", 
                                f"arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-premier-v1:0", 
                                f"arn:aws:bedrock:{self.region}:{self.account}:inference-profile/us.amazon.nova-premier-v1:0",                                
                            ]
                        )
                    ]
                ), 
                "inline_policy_attach_vpc": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "ec2:CreateNetworkInterface",
                                "ec2:DescribeNetworkInterfaces",
                                "ec2:DeleteNetworkInterface",
                                "ec2:AssignPrivateIpAddresses",
                                "ec2:UnassignPrivateIpAddresses"
                            ],
                            resources=["*"]
                        )
                    ]
                ), 
                "inline_policy_s3": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "s3:ListBucket",
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:DeleteObject",
                            ],
                            resources=[
                                webapphosting_stack.s3_demo_web_app_bucket.bucket_arn,
                                webapphosting_stack.s3_demo_web_app_bucket.bucket_arn+'/*',
                            ]
                        )
                    ]
                ),
                "inline_policy_api_gateway": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "apigateway:GET"
                            ],
                            resources=[
                                f"arn:aws:apigateway:{self.region}::/apikeys/*"
                            ]
                        )
                    ]
                ),
                "inline_policy_ecs": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "ecs:RunTask"
                            ],
                            resources=[
                                f"arn:aws:ecs:{self.region}:{self.account}:task-definition/{compute_stack.taskdef_evaluator.family}:*"
                            ]
                        )
                    ]
                ),
                "inline_policy_iam_pass_role": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "iam:PassRole"
                            ],
                            resources=[
                                compute_stack.taskdef_evaluator.obtain_execution_role().role_arn,
                                compute_stack.taskdef_evaluator.task_role.role_arn
                            ]
                        )
                    ]
                ),

            }
        )
        role_lambda.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - FSI Sample GenAI APP
        function_name=f"{self.stack_name}-fsi-sample-genai-app"
        fn_fsi_sample_genai_app = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/fsi-sample-genai-app"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={},
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_fsi_sample_genai_app.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Evaluate
        function_name=f"{self.stack_name}-evaluate"
        fn_evaluate = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/evaluate"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "ECS_CLUSTER": compute_stack.cluster.cluster_name,
                "ECS_TASK_DEFINITION": compute_stack.taskdef_evaluator.family,
                "ECS_SUBNET": [subnet.subnet_id for subnet in network_stack.vpc.select_subnets(subnet_type=ec2.SubnetType.PRIVATE_WITH_NAT).subnets][0],
                "ECS_SECURITY_GROUP": network_stack.sg_ecs.security_group_id,
                "ECS_CONTAINER_NAME": compute_stack.taskdef_evaluator.default_container.container_name,
                "DDBTBL_EVALUATION_REPORT": storage_stack.ddbtbl_evaluation_report.table_name,
                "DDBTBL_EVALUATION_REPORT_QUESTIONS": storage_stack.ddbtbl_evaluation_report_questions.table_name,
                "DDBTBL_SCENARIOS": storage_stack.ddbtbl_scenarios.table_name,
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_evaluate.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Results
        function_name=f"{self.stack_name}-results"
        fn_results = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/results"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_EVALUATION_REPORT": storage_stack.ddbtbl_evaluation_report.table_name,
                "DDBTBL_EVALUATION_REPORT_QUESTIONS": storage_stack.ddbtbl_evaluation_report_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_results.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - New Scenario
        function_name=f"{self.stack_name}-new-scenario"
        fn_new_scenario = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/new-scenario"),
            timeout=Duration.minutes(15),  # Increased timeout for async processing
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIOS": storage_stack.ddbtbl_scenarios.table_name,
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_new_scenario.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - List Scenarios
        function_name=f"{self.stack_name}-list-scenarios"
        fn_list_scenarios = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/list-scenarios"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIOS": storage_stack.ddbtbl_scenarios.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_list_scenarios.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Delete Scenario
        function_name=f"{self.stack_name}-delete-scenario"
        fn_delete_scenario = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/delete-scenario"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIOS": storage_stack.ddbtbl_scenarios.table_name,
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_delete_scenario.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Get Scenario Questions
        function_name=f"{self.stack_name}-get-scenario-questions"
        fn_get_scenario_questions = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/get-scenario-questions"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIOS": storage_stack.ddbtbl_scenarios.table_name,
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_get_scenario_questions.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Delete Scenario Question
        function_name=f"{self.stack_name}-delete-scenario-question"
        fn_delete_scenario_question = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/delete-scenario-question"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_delete_scenario_question.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Update Scenario Question
        function_name=f"{self.stack_name}-update-scenario-question"
        fn_update_scenario_question = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/update-scenario-question"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_update_scenario_question.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Add Scenario Question
        function_name=f"{self.stack_name}-add-scenario-question"
        fn_add_scenario_question = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/add-scenario-question"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_SCENARIO_QUESTIONS": storage_stack.ddbtbl_scenario_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_add_scenario_question.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Update Question Evaluation
        function_name=f"{self.stack_name}-update-question-evaluation"
        fn_update_question_evaluation = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/update-question-evaluation"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_EVALUATION_REPORT": storage_stack.ddbtbl_evaluation_report.table_name,
                "DDBTBL_EVALUATION_REPORT_QUESTIONS": storage_stack.ddbtbl_evaluation_report_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_update_question_evaluation.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Save Evaluation Comment
        function_name=f"{self.stack_name}-save-evaluation-comment"
        fn_save_evaluation_comment = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/save-evaluation-comment"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_EVALUATION_REPORT_QUESTIONS": storage_stack.ddbtbl_evaluation_report_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_save_evaluation_comment.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Delete Result
        function_name=f"{self.stack_name}-delete-result"
        fn_delete_result = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/delete-result"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                "DDBTBL_EVALUATION_REPORT": storage_stack.ddbtbl_evaluation_report.table_name,
                "DDBTBL_EVALUATION_REPORT_QUESTIONS": storage_stack.ddbtbl_evaluation_report_questions.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_delete_result.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create API Gateway CloudWatch Role Permission
        role_api_gateway_cloudwatch = iam.Role(self, 
            f"{self.stack_name}-api_gateway_cloudwatch",
            role_name=f"{self.stack_name}-api_gateway_cloudwatch",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"),
            inline_policies={
                "inline_policy_loggroup": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogGroup", "logs:DescribeLogGroups"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*"]
                        )
                    ]
                ),
                "inline_policy_logstream": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogStream", "logs:DescribeLogStreams", "logs:PutLogEvents", "logs:GetLogEvents", "logs:FilterLogEvents"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*:log-stream:*"]
                        )
                    ]
                )
            }
        )
        role_api_gateway_cloudwatch.apply_removal_policy(RemovalPolicy.DESTROY)
        account = apigateway.CfnAccount(self, "ApiGatewayAccount", cloud_watch_role_arn=role_api_gateway_cloudwatch.role_arn)
        account.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create API Gateway
        apigateway_log_group = logs.LogGroup(self, f"{self.stack_name}-API-Gateway-Prod-Log-Group", 
            log_group_name=f"/aws/apigateway/{self.stack_name}-prod",
            removal_policy=RemovalPolicy.DESTROY,
        )
        apigateway_log_group.apply_removal_policy(RemovalPolicy.DESTROY)
        api = apigateway.RestApi(
            self, f"{self.stack_name}-api",
            endpoint_types=[apigateway.EndpointType.REGIONAL],
            default_cors_preflight_options={
                "allow_origins": apigateway.Cors.ALL_ORIGINS,
                "allow_methods": apigateway.Cors.ALL_METHODS,
                "allow_headers": ["*"],
                "allow_credentials": True,
            },
            deploy_options=apigateway.StageOptions(
                access_log_destination=apigateway.LogGroupLogDestination(
                    apigateway_log_group
                ),
                access_log_format=apigateway.AccessLogFormat.json_with_standard_fields(
                    caller=True,http_method=True,ip=True,protocol=True,request_time=True,resource_path=True,response_length=True,status=True,user=True
                ),
                logging_level=apigateway.MethodLoggingLevel.ERROR,
                tracing_enabled=True
            ),
            
        )
        api.apply_removal_policy(RemovalPolicy.DESTROY)
        CfnOutput(self, "API Endpoint", value=api.url)

        api.add_request_validator(
            id=f"{self.stack_name}-RestAPIRequestValidator",
            request_validator_name="RestAPIRequestValidator",
            validate_request_body=True,
            validate_request_parameters=True
        )

        # Create a WAFv2 web ACL for API GATEWAY REST API
        web_acl_api = waf.CfnWebACL(self, f"{self.stack_name}-waf-acl-api",
            scope="REGIONAL",
            default_action=waf.CfnWebACL.DefaultActionProperty(allow={}),
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name=f"{self.stack_name}-waf-acl-api",
                sampled_requests_enabled=True
            )
        )
        web_acl_api.apply_removal_policy(RemovalPolicy.DESTROY)

        # Associate the WAFv2 web ACL with the API Gateway REST API
        waf_association = waf.CfnWebACLAssociation(self, f"{self.stack_name}-WAFAssociation-API",
            resource_arn=f"arn:aws:apigateway:{self.region}::/restapis/{api.rest_api_id}/stages/{api.deployment_stage.stage_name}",
            web_acl_arn=web_acl_api.attr_arn            
        )
        waf_association.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /fsi-sample-genai-app resource with Lambda proxy integration
        fsi_sample_genai_app_resource = api.root.add_resource('fsi-sample-genai-app')
        fsi_sample_genai_app_resource.add_method('GET', apigateway.LambdaIntegration(fn_fsi_sample_genai_app), api_key_required=True)
        fsi_sample_genai_app_resource.add_method('POST', apigateway.LambdaIntegration(fn_fsi_sample_genai_app), api_key_required=True)
        fsi_sample_genai_app_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /evaluate resource with Lambda proxy integration
        evaluate_resource = api.root.add_resource('evaluate')
        evaluate_resource.add_method('POST', apigateway.LambdaIntegration(fn_evaluate), api_key_required=True)
        evaluate_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /results resource with Lambda proxy integration
        results_resource = api.root.add_resource('results')
        results_resource.add_method('GET', apigateway.LambdaIntegration(fn_results), api_key_required=True)
        results_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /new-scenario resource with Lambda async integration (non-proxy)
        new_scenario_resource = api.root.add_resource('new-scenario')
        
        # Grant API Gateway permission to invoke the Lambda function
        fn_new_scenario.add_permission(
            f"{self.stack_name}-new-scenario-api-gateway-invoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{self.region}:{self.account}:{api.rest_api_id}/*/*"
        )
        
        new_scenario_integration = apigateway.AwsIntegration(
            service="lambda",
            integration_http_method="POST",
            path=f"2015-03-31/functions/{fn_new_scenario.function_arn}/invocations",
            options=apigateway.IntegrationOptions(
                request_parameters={
                    "integration.request.header.X-Amz-Invocation-Type": "'Event'"
                },
                integration_responses=[
                    apigateway.IntegrationResponse(
                        status_code="202",
                        response_templates={
                            "application/json": '{"message": "Scenario creation started", "status": "PROCESSING"}'
                        },
                        response_parameters={
                            "method.response.header.Access-Control-Allow-Origin": "'*'",
                            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                            "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET,POST,PUT,DELETE'"
                        }
                    )
                ]
            )
        )
        new_scenario_resource.add_method(
            'POST', 
            new_scenario_integration, 
            api_key_required=True,
            method_responses=[
                apigateway.MethodResponse(
                    status_code="202",
                    response_models={
                        "application/json": apigateway.Model.EMPTY_MODEL
                    },
                    response_parameters={
                        "method.response.header.Access-Control-Allow-Origin": True,
                        "method.response.header.Access-Control-Allow-Headers": True,
                        "method.response.header.Access-Control-Allow-Methods": True
                    }
                )
            ]
        )
        new_scenario_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /list-scenarios resource with Lambda proxy integration
        list_scenarios_resource = api.root.add_resource('list-scenarios')
        list_scenarios_resource.add_method('GET', apigateway.LambdaIntegration(fn_list_scenarios), api_key_required=True)
        list_scenarios_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /delete-scenario resource with Lambda proxy integration
        delete_scenario_resource = api.root.add_resource('delete-scenario')
        delete_scenario_resource.add_method('GET', apigateway.LambdaIntegration(fn_delete_scenario), api_key_required=True)
        delete_scenario_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /get-scenario-questions resource with Lambda proxy integration
        get_scenario_questions_resource = api.root.add_resource('get-scenario-questions')
        get_scenario_questions_resource.add_method('GET', apigateway.LambdaIntegration(fn_get_scenario_questions), api_key_required=True)
        get_scenario_questions_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /delete-scenario-question resource with Lambda proxy integration
        delete_scenario_question_resource = api.root.add_resource('delete-scenario-question')
        delete_scenario_question_resource.add_method('GET', apigateway.LambdaIntegration(fn_delete_scenario_question), api_key_required=True)
        delete_scenario_question_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /update-scenario-question resource with Lambda proxy integration
        update_scenario_question_resource = api.root.add_resource('update-scenario-question')
        update_scenario_question_resource.add_method('POST', apigateway.LambdaIntegration(fn_update_scenario_question), api_key_required=True)
        update_scenario_question_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /add-scenario-question resource with Lambda proxy integration
        add_scenario_question_resource = api.root.add_resource('add-scenario-question')
        add_scenario_question_resource.add_method('POST', apigateway.LambdaIntegration(fn_add_scenario_question), api_key_required=True)
        add_scenario_question_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /update-question-evaluation resource with Lambda proxy integration
        update_question_evaluation_resource = api.root.add_resource('update-question-evaluation')
        update_question_evaluation_resource.add_method('POST', apigateway.LambdaIntegration(fn_update_question_evaluation), api_key_required=True)
        update_question_evaluation_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /save-evaluation-comment resource with Lambda proxy integration
        save_evaluation_comment_resource = api.root.add_resource('save-evaluation-comment')
        save_evaluation_comment_resource.add_method('POST', apigateway.LambdaIntegration(fn_save_evaluation_comment), api_key_required=True)
        save_evaluation_comment_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create /delete-result resource with Lambda proxy integration
        delete_result_resource = api.root.add_resource('delete-result')
        delete_result_resource.add_method('DELETE', apigateway.LambdaIntegration(fn_delete_result), api_key_required=True)
        delete_result_resource.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create API key and usage plan
        api_key = api.add_api_key(f"{self.stack_name}-apiKey", api_key_name=f"{self.stack_name}-apiKey")
        api_key.apply_removal_policy(RemovalPolicy.DESTROY)

        usage_plan = api.add_usage_plan(
            f"{self.stack_name}-apiUsagePlan",
            name=f"{self.stack_name}-apiUsagePlan",
            api_stages=[apigateway.UsagePlanPerApiStage(api=api, stage=api.deployment_stage)],
        )
        usage_plan.add_api_key(api_key)
        usage_plan.apply_removal_policy(RemovalPolicy.DESTROY)
        CfnOutput(self, "API Key ID", value=api_key.key_id)










        
        #  ██████ ██    ██ ███████ ████████  ██████  ███    ███     ██████  ███████ ███████  ██████  ██    ██ ██████   ██████ ███████ 
        # ██      ██    ██ ██         ██    ██    ██ ████  ████     ██   ██ ██      ██      ██    ██ ██    ██ ██   ██ ██      ██      
        # ██      ██    ██ ███████    ██    ██    ██ ██ ████ ██     ██████  █████   ███████ ██    ██ ██    ██ ██████  ██      █████   
        # ██      ██    ██      ██    ██    ██    ██ ██  ██  ██     ██   ██ ██           ██ ██    ██ ██    ██ ██   ██ ██      ██      
        #  ██████  ██████  ███████    ██     ██████  ██      ██     ██   ██ ███████ ███████  ██████   ██████  ██   ██  ██████ ███████ 

        
        # Create Lambda Functions - Custom - Populate webapp env
        function_name = f"{self.stack_name}-custom-populate-webapp-env"
        fn_custom_populate_webapp_env = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_14,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/custom/populate-webapp-env"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'APIKEY_ID': api_key.key_id,
                'API_ENDPOINT': api.url,
                'WEBAPP_S3BUCKET': webapphosting_stack.s3_demo_web_app_bucket.bucket_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_custom_populate_webapp_env.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Custom Resource IAM Permission
        role_custom_resource = iam.Role(self,
            f"{self.stack_name}-custom_resource_role",
            role_name=f"{self.stack_name}-custom_resource_role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            inline_policies={
                "inline_policy_invoke_function": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["lambda:InvokeFunction"],
                            resources=[fn_custom_populate_webapp_env.function_arn]
                        )
                    ]
                )
            }
        )
        role_custom_resource.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Custom Resource
        cr_populate_webapp_env = cr.AwsCustomResource(
            self, "invoke-populate_webapp_env",
            on_create=cr.AwsSdkCall(
                service="Lambda",
                action="invoke",
                parameters={
                    "FunctionName": fn_custom_populate_webapp_env.function_name,
                    "Payload": "{}"
                },
                physical_resource_id=cr.PhysicalResourceId.of("CustomResourceId")
            ),
            on_update=cr.AwsSdkCall(
                service="Lambda",
                action="invoke",
                parameters={
                    "FunctionName": fn_custom_populate_webapp_env.function_name,
                    "Payload": "{}"
                },
                physical_resource_id=cr.PhysicalResourceId.of("deployment_time:"+ str(time.time()))
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
            ),
            role=role_custom_resource,
        )
        cr_populate_webapp_env.node.add_dependency(api_key)
        cr_populate_webapp_env.node.add_dependency(api)
        cr_populate_webapp_env.node.add_dependency(webapphosting_stack.s3_demo_web_app_bucket)