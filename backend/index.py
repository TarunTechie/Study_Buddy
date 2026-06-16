from fastapi import FastAPI , WebSocket , WebSocketDisconnect
from utils.fileOps import router as fileRouter
from utils.dbOps import router as dbRouter
from planner import router as chatRouter
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(fileRouter)
app.include_router(dbRouter)
app.include_router(chatRouter)

@app.get('/')
def hello():
    return {"Server is running"}

@app.websocket('/msg')
async def message(websocket:WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data=await websocket.receive_text()
            
            await websocket.send_text("You sent {data} I say hello")
    except WebSocketDisconnect:
        print("Websocket Disconnected")
    except Exception as e:
        print("Unexpected Error in connection {e}")   