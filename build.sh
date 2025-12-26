# Create and activate virtual environment
uv sync 

# To build the React-based web application:
npm install --prefix ui/
npm run build --prefix ui/

# To download python dependencies required for creating the AWS Lambda Layer:
rm -rf layers/python/
mkdir layers/python/
uv run pip install --no-deps -r layers/requirements.txt -t layers/python/.
