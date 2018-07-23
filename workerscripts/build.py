import os
import json
import shutil

shutil.rmtree('./workers', ignore_errors=True)
os.system('tsc')

for file in os.listdir('./utils'):
    shutil.copy('./utils/'+file, './workers/assets/Scripts/'+file)

shutil.rmtree('../build/wechatgame/workers', ignore_errors=True)
shutil.copytree('./workers', '../build/wechatgame/workers')

with open('../build/wechatgame/game.json', 'r+') as f:
    obj = json.loads(f.read())
    obj['workers'] = 'workers'
    f.seek(0)
    f.write(json.dumps(obj, indent=4))
    f.truncate()
