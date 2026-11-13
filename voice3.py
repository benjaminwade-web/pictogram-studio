import json,subprocess,base64,sys
D=sys.argv[1].rstrip('/')+'/'; vid=sys.argv[2] if len(sys.argv)>2 else 'JBFqnCBsd6RMkjVDRZzb'; stab=float(sys.argv[3]) if len(sys.argv)>3 else 0.5
text=open(D+'voiceover.txt').read().strip()
body=json.dumps({"text":text,"model_id":"eleven_v3","voice_settings":{"stability":stab,"similarity_boost":0.75}})
r=subprocess.run(['curl','-sS','-X','POST',f'https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128','-H','Content-Type: application/json','--data-binary','@-'],input=body.encode(),capture_output=True)
j=json.loads(r.stdout)
if 'audio_base64' not in j: print(j); sys.exit(1)
open(D+'voice.mp3','wb').write(base64.b64decode(j['audio_base64']))
al=j.get('alignment') or j.get('normalized_alignment'); W=[];cur=None
for i,ch in enumerate(al['characters']):
  if ch.isspace():
    if cur: W.append(cur); cur=None
    continue
  if not cur: cur={'w':'','s':al['character_start_times_seconds'][i]}
  cur['w']+=ch; cur['e']=al['character_end_times_seconds'][i]
if cur: W.append(cur)
json.dump({'voice':vid,'model':'eleven_v3','words':W},open(D+'voice-words.json','w'))
print(len(W),W[-1]['e']); print(' '.join(f"{w['w']}@{w['s']:.2f}" for w in W))
