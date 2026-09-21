from dotenv import load_dotenv
import os
load_dotenv()
URL=os.environ.get('SUPABASE_URL')
KEY=os.environ.get('SUPABASE_KEY')

if not (URL or KEY):
    raise RuntimeError("Missing Supabase keys")

from supabase import create_client

sb_client=create_client(supabase_url=URL,supabase_key=KEY)

table_client=sb_client.table('projects')
storage_client=sb_client.storage.from_('studybuddy_files')