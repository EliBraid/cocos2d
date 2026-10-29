import sys,json,numpy as np,cv2
from PIL import Image
sys.path.insert(0,'.');from spec import SPEC
SRC='/tmp/claude-0/shim/www/assets/resources/pets/portrait/';OUT='/tmp/claude-0/rig/out/'
import os;os.makedirs(OUT,exist_ok=True)
S=384;man={}
def mask(shapes,feather=3):
    m=np.zeros((S,S),np.uint8)
    for sh in shapes:
        if sh[0]=='r':cv2.rectangle(m,(int(sh[1]*S),int(sh[2]*S)),(int(sh[3]*S)-1,int(sh[4]*S)-1),255,-1)
        else:cv2.ellipse(m,(int(sh[1]*S),int(sh[2]*S)),(int(sh[3]*S),int(sh[4]*S)),0,0,360,255,-1)
    return m
for kind,(id,parts) in SPEC.items():
    im=np.array(Image.open(SRC+id+'.png').convert('RGBA'));al=im[...,3]
    owner=np.full((S,S),-1,int)  # part index owning each pixel, highest z / child wins
    order=sorted(range(len(parts)),key=lambda i:(parts[i]['z']))
    for i in order:
        m=mask(parts[i]['shapes'])>0
        owner[m&(al>8)]=i
    # parents contain their children's area; ownership priority handles it
    union=(owner>=0).astype(np.uint8)*255
    inp=cv2.inpaint(np.ascontiguousarray(im[...,:3]),cv2.dilate(union,np.ones((5,5),np.uint8)),5,cv2.INPAINT_TELEA)
    # body: everything not owned keeps original, owned area filled with inpaint; alpha of owned area = dilated original alpha so silhouette stays solid
    body=im.copy();ow=owner>=0
    K=np.ones((3,3),np.uint8)
    for i,p in enumerate(parts):
        if p['role'] in ('head','legA','legB'):continue   # solid parts keep original pixels underneath
        hole=cv2.dilate((owner==i).astype(np.uint8),K,iterations=1)>0
        body[hole,3]=0
    # make the hole's alpha stay (so nothing shows through) but slightly eroded to avoid halo
    Image.fromarray(body).save(OUT+f'{id}_body.png')
    man[kind]={'id':id,'parts':[]}
    for i,p in enumerate(parts):
        pm=(owner==i)
        a=cv2.dilate(pm.astype(np.uint8)*255,K,iterations=2);a=cv2.GaussianBlur(a,(0,0),0.7)
        pi=im.copy();pi[...,3]=(al.astype(np.float32)*a/255).astype(np.uint8)
        # trim to bbox but keep canvas coords: store crop + offset
        ys,xs=np.where(pi[...,3]>0)
        if len(xs)==0:print('EMPTY',kind,p['id']);continue
        x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
        Image.fromarray(pi[y0:y1,x0:x1]).save(OUT+f"{id}_{p['id']}.png")
        d={k:v for k,v in p.items() if k!='shapes'};d['box']=[int(x0),int(y0),int(x1),int(y1)];man[kind]['parts'].append(d)
json.dump(man,open(OUT+'manifest.json','w'),ensure_ascii=False)
print({k:len(v['parts']) for k,v in man.items()})
