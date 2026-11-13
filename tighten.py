# shorten long pauses in a voice track and remap word times. usage: tighten.py dir [maxgap 0.42] [tempo 1.0]
import json,subprocess,sys
D=sys.argv[1].rstrip('/')+'/'; MG=float(sys.argv[2]) if len(sys.argv)>2 else 0.42; TEMPO=float(sys.argv[3]) if len(sys.argv)>3 else 1.0
j=json.load(open(D+'voice-words.json')); W=j['words']
import re
log=subprocess.run(['ffmpeg','-i',D+'voice.mp3','-af','silencedetect=noise=-38dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',log)]; en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',log)]
keep=[]; s0=0.0
for a,b in zip(st,en):
  if b-a>MG and a>0.05:
    cut0=a+MG*0.5; cut1=b-MG*0.5; keep.append((s0,cut0)); s0=cut1
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',D+'voice.mp3']))
keep.append((s0,min(dur,W[-1]['e']+0.5)))
f=''.join(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b-a-0.03:.3f}:d=0.03[s{i}];" for i,(a,b) in enumerate(keep))
f+=''.join(f"[s{i}]" for i in range(len(keep)))+f"concat=n={len(keep)}:v=0:a=1,atempo={TEMPO}[o]"
subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',D+'voice.mp3','-filter_complex',f,'-map','[o]','-ar','44100',D+'voice-tight.wav'])
def remap(t):
  acc=0.0
  for a,b in keep:
    if t<a: return (acc)/TEMPO
    if t<=b: return (acc+t-a)/TEMPO
    acc+=b-a
  return acc/TEMPO
W2=[{'w':w['w'],'s':round(remap(w['s']),3),'e':round(remap(w['e']),3)} for w in W]
j2=dict(j); j2['words']=W2; j2['tightened']={'maxgap':MG,'tempo':TEMPO,'source':'voice.mp3'}
json.dump(j2,open(D+'voice-words-tight.json','w'))
print('segments',len(keep),'new length',round(W2[-1]['e'],2))
