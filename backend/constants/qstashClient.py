from qstash import QStash
from qstash import Receiver
from dotenv import load_dotenv
import os

load_dotenv()

QSTASH_TOKEN = os.environ.get('QSTASH_TOKEN')
QSTASH_CURRENT_SIGNING_KEY = os.environ.get('QSTASH_CURRENT_SIGNING_KEY')
QSTASH_NEXT_SIGNING_KEY = os.environ.get('QSTASH_NEXT_SIGNING_KEY')

qstash_client = QStash(token=QSTASH_TOKEN)

receiver = Receiver(
    current_signing_key=QSTASH_CURRENT_SIGNING_KEY,
    next_signing_key=QSTASH_NEXT_SIGNING_KEY,
)
