from upstash_redis import Redis
from dotenv import load_dotenv
import os
load_dotenv()
URL=os.environ.get('UPSTASH_REDIS_REST_URL')
TOKEN=os.environ.get('UPSTASH_REDIS_REST_TOKEN')
redis = Redis(url=URL, token=TOKEN)