FROM public.ecr.aws/amazonlinux/amazonlinux:latest

RUN yum install -y python3 python3-pip shadow-utils

# Create a non-root user named 'appuser' and switch to using it
RUN useradd -m -d /home/appuser -s /bin/bash appuser
WORKDIR /app
USER appuser

COPY requirements.txt .
COPY index.py .

RUN python3 -m pip install -r requirements.txt

CMD ["python3", "index.py"]