:: this path should be changed by users
set COCOS_PATH=D:\CocosCreator

set MAIN_PATH=.
set SD_PATH=..\CloseTheLoopWXSD
%COCOS_PATH%\CocosCreator.exe --path %MAIN_PATH% --build
%COCOS_PATH%\CocosCreator.exe --path %SD_PATH% --build
cd .\workerscripts && python build.py && cd ..
pause