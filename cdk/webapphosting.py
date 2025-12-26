from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3_deployment as s3d,
    CfnOutput,
    Stack,
    aws_wafv2 as waf,
    Duration,
)
from constructs import Construct
import time

class WebAppHostingStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Create S3 Bucket for access logging - web app
        s3_server_access_log_bucket_web_app = s3.Bucket(self, f"{self.stack_name}-server-access-log-bucket-web-app",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
            access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned=True,
        )

        # Create S3 Bucket for access logging - cloudfront
        s3_server_access_log_bucket_cloudfront = s3.Bucket(self, f"{self.stack_name}-server-access-log-bucket-cloudfront",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
            access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned=True,
        )
        
        # # Create S3 Bucket & CloudFront for hosting demo web application
        s3_demo_web_app_bucket = s3.Bucket(self, f"{self.stack_name}-demo-web-app",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            server_access_logs_bucket=s3_server_access_log_bucket_web_app,
            enforce_ssl=True,
            versioned=True,
        )
        self.s3_demo_web_app_bucket = s3_demo_web_app_bucket
        
        # Deploy the React app to S3 bucket
        s3_deployment = s3d.BucketDeployment(self, f"{self.stack_name}-DemoWebAppDeployment",
            sources=[s3d.Source.asset("ui/dist")],
            destination_bucket=s3_demo_web_app_bucket,
            retain_on_delete=False,
            metadata={"deployment_time": str(time.time())} # uncomment to re-deploy web app in every cdk deploy
        )
        
        # Create a WAFv2 web ACL
        web_acl_cloudfront = waf.CfnWebACL(self, f"{self.stack_name}-waf-acl-cloudfront",
            scope="CLOUDFRONT",
            default_action=waf.CfnWebACL.DefaultActionProperty(allow={}),
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name=f"{self.stack_name}-waf-acl-cloudfront",
                sampled_requests_enabled=True
            )
        )
        web_acl_cloudfront.apply_removal_policy(RemovalPolicy.DESTROY)
        web_acl_cloudfront.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create a CloudFront distribution
        cloudfront_distribution = cloudfront.Distribution(self, f"{self.stack_name}-CloudFront",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    s3_demo_web_app_bucket,
                ),
                cache_policy=cloudfront.CachePolicy(
                    self, f"{self.stack_name}-CachePolicy",
                    min_ttl=Duration.seconds(0),
                    max_ttl=Duration.seconds(0),
                    default_ttl=Duration.seconds(0),
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            default_root_object="index.html",
            log_bucket=s3_server_access_log_bucket_cloudfront,
            log_file_prefix="cloudfrontlogs/",
            web_acl_id=web_acl_cloudfront.attr_arn,
        )
        cloudfront_distribution.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Output the CloudFront distribution URL
        CfnOutput(self, "Web Application URL", value=cloudfront_distribution.distribution_domain_name)