from constants.constants import FolderStructure
from constants.supabaseClient import storage_client
from fastapi import APIRouter, UploadFile, File
from typing import List
from utils.dbOps import deleteCollection

router = APIRouter()


@router.post('/uploadFiles')
def addFiles(subject: str, session_id: str = None, files: List[UploadFile] = File(...)):
    try:
        for file in files:
            file_bytes = file.file.read()
            if session_id:
                path = f"{session_id}/{subject}/{file.filename}"
            else:
                path = f"{subject}/{file.filename}"
            storage_client.upload(
                path=path,
                file=file_bytes,
                file_options={"content-type": file.content_type or "application/octet-stream", "upsert": "true"},
            )
        return {"status": "File(s) uploaded"}
    except Exception as e:
        return {"status": "File(s) not uploaded", "error": str(e)}


@router.delete('/delete')
def removeFiles(folderStructure: FolderStructure):
    if not folderStructure.folderName:
        return {"message": "No folderName"}

    try:
        if folderStructure.fileName is None:
            listed = storage_client.list(folderStructure.folderName)
            paths = [f"{folderStructure.folderName}/{obj['name']}" for obj in listed]
            if paths:
                storage_client.remove(paths)
            deleteCollection(folderStructure.folderName)
        else:
            path = f"{folderStructure.folderName}/{folderStructure.fileName}"
            storage_client.remove([path])
        return {"message": "Removed successfully"}
    except Exception as e:
        return {"message": "Could not find the folder/file", "error": str(e)}


@router.get('/getFolderStructure')
def getFolderStructure():
    try:
        top_level = storage_client.list()
    except Exception as e:
        return {"error": f"Could not access storage bucket: {str(e)}"}

    folder_structure = {"root": []}

    for entry in top_level:
        name = entry.get("name", "")
        if entry.get("id") is None:
            try:
                children = storage_client.list(name)
                folder_structure[name] = [child["name"] for child in children]
            except Exception:
                folder_structure[name] = []
        else:
            folder_structure["root"].append(name)

    return folder_structure
