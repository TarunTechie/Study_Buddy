import os
import shutil
from constants.constants import FolderStructure,root_path
from fastapi import APIRouter , UploadFile , File , Depends
from typing import List
router=APIRouter()

@router.post('/uploadFiles')
def addFiles(subject,files:List[UploadFile]=File(...)):
    directory=f'{root_path}/{subject}'
    os.makedirs(directory,exist_ok=True)
    
    try:
        for file in files:
            file_path=os.path.join(directory,file.filename)
            with open(file_path,'wb') as f:
                f.write(file.file.read())
        return {"status":"File(s) uploaded"}
    except:
        return {"status":"File(s) not uploaded"}

@router.delete('/delete')
def removeFiles(folderStructure:FolderStructure=Depends()):
    if folderStructure.folderName:
        try:
            if folderStructure.fileName==None:
                folderPath=os.path.join(root_path,folderStructure.folderName)
                shutil.rmtree(folderPath)
            else:
                filePath=os.path.join(root_path,folderStructure.folderName,folderStructure.fileName)
                os.remove(filePath)
            return {"message":"Removed succesfully"}
        except:
            return {"messsage":"Couldnt not find the folder/file"}
    else:
        return {"message":"No folderName"} 

@router.get('/getFolderStructure')    
def getFolderStructure():
    try:
        files=os.scandir(root_path)
    except:
        return {f"Root folder:`{root_path}` not found"}
    
    folder_structure={
        "root":[],
    }
    for f in files:
        if f.is_dir():
            sub_files=[]
            folderPath=os.scandir(os.path.join(root_path,f.name))
            
            for file in folderPath:
                sub_files.append(file.name)
            folder_structure.update({f.name:sub_files})
        else:
            folder_structure['root'].append(f.name)
        
    return folder_structure
