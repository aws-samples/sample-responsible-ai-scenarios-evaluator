from aws_cdk import (
    aws_ec2 as ec2,
    aws_logs as logs,
    Stack,
    RemovalPolicy,
    Stack,
)
from constructs import Construct
import time

class NetworkStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Create VPC with two private subnets
        vpc = ec2.Vpc(self, f"{self.stack_name}-MyVpc",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2,
            nat_gateways=1
        )
        self.vpc = vpc
        vpc.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create VPC Gateway Endpoints for DynamoDB
        dynamodb_endpoint = vpc.add_gateway_endpoint(f"{self.stack_name}-DynamoDbEndpoint",service=ec2.GatewayVpcEndpointAwsService.DYNAMODB, )
        dynamodb_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create VPC Gateway Endpoints for S3
        s3_endpoint = vpc.add_gateway_endpoint(f"{self.stack_name}-S3Endpoint",service=ec2.GatewayVpcEndpointAwsService.S3,)
        s3_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Security Group - ECS Task
        sg_ecs = ec2.SecurityGroup(
            self, f"{self.stack_name}-ecs-security-group",
            security_group_name=f"{self.stack_name}-ecs-security-group",
            vpc=vpc,
        )
        self.sg_ecs = sg_ecs
        sg_ecs.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Security Group - VPC Endpoint
        sg_vpc_endpoint = ec2.SecurityGroup(
            self, f"{self.stack_name}-vpc-endpoint-security-group",
            security_group_name=f"{self.stack_name}-vpc-endpoint-security-group",
            vpc=vpc,
        )
        sg_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        sg_vpc_endpoint.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), connection=ec2.Port.tcp(443))
        
        # Create VPC Interface Endpoints for Bedrock Runtime
        interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{self.stack_name}-BedrockInterfaceVpcEndpoint",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.bedrock-runtime", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for ECR API
        ecr_api_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{self.stack_name}-ecr.api",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.ecr.api", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        ecr_api_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for ECR DKR
        ecr_dkr_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{self.stack_name}-ecr.dkr",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.ecr.dkr", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        ecr_dkr_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for Cloudwatch Logs
        logs_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{self.stack_name}-logs",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.logs", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        logs_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create CloudWatch Log Group for VPC Flow Logs
        flow_log_group = logs.LogGroup(
            self, f"{self.stack_name}-vpc-flow-logs",
            log_group_name=f"/aws/vpc/flowlogs/{self.stack_name}",
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # Create VPC Flow Log
        vpc_flow_log = ec2.FlowLog(
            self, f"{self.stack_name}-vpc-flow-log",
            resource_type=ec2.FlowLogResourceType.from_vpc(vpc),
            destination=ec2.FlowLogDestination.to_cloud_watch_logs(flow_log_group),
            traffic_type=ec2.FlowLogTrafficType.ALL
        )
        vpc_flow_log.apply_removal_policy(RemovalPolicy.DESTROY)
        
        