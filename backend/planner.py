from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import ToolMessage
from langchain_core.chat_history import InMemoryChatMessageHistory
from fastapi import APIRouter , WebSocket , WebSocketDisconnect

from constants.models import chatModel
from constants.constants import planning_system_prompt
from utils.tools import search_with_model

MAX_LOOP=3
router=APIRouter()

tools_dict={
    "search_with_model":search_with_model
}
tools=tools_dict.values()

@router.websocket('/ws/msg')
async def planner(websocket:WebSocket,subject:str):
    await websocket.accept()
    try:
        while True:
            message=await websocket.receive_text()
            await websocket.send_json({"type":"STEP","msg":'Seraching your notes'})
            print(f"Got {message} and looking in {subject}")
            model_wtools=chatModel.bind_tools(tools=tools)
            
            question=ChatPromptTemplate([('system',planning_system_prompt),('human','{doubt}')])
            
            chat_history=question.format_messages(subject=subject,doubt=message)
            session=InMemoryChatMessageHistory()
            session.add_messages(chat_history)
            
            loop_count=0
            while True:
                print(f'{loop_count+1} iteration')
                loop_count+=1
                reply=model_wtools.invoke(session.messages)
                
                session.add_message(reply)
                print(reply)
                await websocket.send_json({"type":"STEP","msg":reply.content})
                if(reply.tool_calls):
                    print(f'Model is calling {reply.tool_calls} tools')
                    for tool in reply.tool_calls:
                        name=tool['name']
                        args=tool['args']
                        id=tool['id']
                        args['subject']=subject
                        if name in tools_dict:
                            tool_output=await tools_dict[name].ainvoke(args)
                            session.add_message(ToolMessage(content=tool_output,tool_call_id=id))
                else:
                    final_answer=chatModel.invoke(session.messages)
                    await websocket.send_json({"type":"ANS","msg":final_answer.content})
                    break
    except WebSocketDisconnect:
        print("Diconnected")
    except Exception:
        print(Exception)
