"""Layered original Hollow Oath II effects, including three separate sword cues.

No downloaded samples. numpy synthesis + ffmpeg OGG/AAC. Existing music untouched.
"""
from pathlib import Path
import json,subprocess,tempfile,wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/audio'
WORK=Path(tempfile.gettempdir())/'hollow-oath-2-sfx-v2'
SR=44100

def noise(rng,n,lo,hi):
    raw=rng.normal(0,1,n)
    freq=np.fft.rfftfreq(n,1/SR)
    band=(1-np.exp(-(freq/max(1,lo))**4))*np.exp(-(freq/hi)**4)
    shaped=np.fft.irfft(np.fft.rfft(raw)*band,n)
    return shaped/max(.001,float(np.std(shaped)))

def decay(t,start,rate):
    s=np.maximum(0,t-start)
    return (t>=start)*(1-np.exp(-s*1100))*np.exp(-s*rate)

def tone(t,freq,start=0,rate=12):
    return np.sin(2*np.pi*freq*np.maximum(0,t-start))*decay(t,start,rate)

def make(name):
    lengths={'steel-1':.39,'steel-2':.52,'steel-3':.34,'fire':.76,'ice':.69,
             'heal':.92,'guard':.71,'reward':.95,'select':.10,'hit':.25,'storm':.85}
    duration=lengths[name];t=np.arange(round(duration*SR))/SR
    rng=np.random.default_rng(771+list(lengths).index(name))
    x=np.zeros_like(t)
    if name.startswith('steel'):
        variant=int(name[-1]);impact=[.085,.135,.055][variant-1]
        # Swept air begins before the transient, then metal and body take over.
        whoosh=noise(rng,len(t),480,5200)
        env=np.exp(-((t-(impact-.027))/.042)**2)
        x+=.10*whoosh*env
        x+=.17*noise(rng,len(t),900,11500)*decay(t,impact,90)
        x+=.19*tone(t,[130,94,172][variant-1],impact,22)
        fundamentals=[[1375,2231,3372,4811],[986,1741,2623,3907],[1811,2797,4261,6121]][variant-1]
        for j,freq in enumerate(fundamentals):
            x+=(.09/(1+j*.7))*tone(t,freq,impact,12+j*7)
        x+=.035*noise(rng,len(t),4200,14000)*decay(t,impact+.028,38)
    elif name=='fire':
        x+=.12*noise(rng,len(t),150,2600)*np.sin(np.pi*t/duration)**1.7
        x+=.075*noise(rng,len(t),1100,8500)*decay(t,.075,6)
        x+=.07*np.sin(2*np.pi*(320*t+170*t*t))*decay(t,.035,7)
        for start in [.10,.18,.27,.39]:x+=.045*noise(rng,len(t),2200,10000)*decay(t,start,90)
    elif name=='ice':
        x+=.085*noise(rng,len(t),2800,13500)*decay(t,.015,35)
        for j,freq in enumerate([1673,2317,3251,4799,6353]):x+=(.09/(1+j*.5))*tone(t,freq,.025+j*.011,7+j*2)
        x+=.04*noise(rng,len(t),1200,5000)*np.exp(-((t-.13)/.07)**2)
    elif name=='heal':
        for j,freq in enumerate([523.25,659.25,783.99,1046.5]):
            x+=.095*tone(t,freq,.06*j,5.5)
            x+=.025*tone(t,freq*2.003,.06*j,8)
        x+=.025*noise(rng,len(t),3500,10000)*np.sin(np.pi*t/duration)**2
    elif name=='guard':
        x+=.10*noise(rng,len(t),350,2000)*np.exp(-((t-.08)/.04)**2)
        for j,freq in enumerate([196,293.66,392,622.25,1174.66]):x+=(.08/(1+j*.35))*tone(t,freq,.045,6+j*2)
        x+=.04*np.sin(2*np.pi*(90*t+240*t*t))*decay(t,.02,9)
    elif name=='reward':
        for j,freq in enumerate([659.25,783.99,987.77,1318.5]):
            x+=.10*tone(t,freq,j*.105,7)
            x+=.025*tone(t,freq*2.756,j*.105,15)
        x+=.022*noise(rng,len(t),4500,13000)*decay(t,.32,20)
    elif name=='select':
        x+=.12*noise(rng,len(t),1700,7000)*decay(t,.002,110)
        x+=.12*tone(t,630,.002,65)+.035*tone(t,1733,.002,80)
    elif name=='hit':
        x+=.19*noise(rng,len(t),120,2200)*decay(t,.012,35)
        x+=.17*np.sin(2*np.pi*(140*t-130*t*t))*decay(t,.008,28)
    else:
        for start in [.015,.055,.12]:x+=.13*noise(rng,len(t),1700,13000)*decay(t,start,75)
        x+=.14*noise(rng,len(t),35,520)*decay(t,.07,5)
        x+=.065*np.sin(2*np.pi*(68*t-17*t*t))*decay(t,.045,6)
    x*=np.minimum(1,t/.002)*np.minimum(1,(duration-t)/.035)
    # Restrained left-to-right movement, not a mono beep duplicated to stereo.
    direction=-1 if name=='steel-2' else 1
    pan=np.clip(direction*(t/duration-.5)*.65,-.5,.5)
    stereo=np.column_stack([x*np.sqrt((1-pan)/2),x*np.sqrt((1+pan)/2)])
    # A very quiet short reflection gives body without a long ringing tail.
    delay=round(.023*SR);stereo[delay:]+=.06*stereo[:-delay,::-1]
    target=.43 if name.startswith('steel') else .36
    stereo*=target/max(1e-8,float(np.max(np.abs(stereo))))
    stereo[-256:]*=np.linspace(1,0,256)[:,None]
    assert np.isfinite(stereo).all() and np.max(np.abs(stereo))<.9
    return stereo

def main():
    WORK.mkdir(exist_ok=True);report={}
    names=['steel-1','steel-2','steel-3','fire','ice','heal','guard','reward','select','hit','storm']
    for name in names:
        audio=make(name);wav=WORK/f'{name}.wav'
        with wave.open(str(wav),'wb') as f:
            f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
            f.writeframes(np.round(audio*32767).astype('<i2').tobytes())
        for ext,args in [('ogg',['-c:a','libvorbis','-q:a','4']),('m4a',['-c:a','aac','-b:a','128k'])]:
            subprocess.run(['/opt/homebrew/bin/ffmpeg','-hide_banner','-loglevel','error','-i',str(wav),*args,'-y',str(OUT/f'sfx-{name}.{ext}')],check=True)
        report[name]={'duration':len(audio)/SR,'peakDb':float(20*np.log10(np.max(np.abs(audio)))),'rmsDb':float(20*np.log10(np.sqrt(np.mean(audio**2)))),'channels':2}
    # Retain the old public filename for saved offline versions; new code varies 1–3.
    import shutil
    for ext in ['ogg','m4a']:shutil.copyfile(OUT/f'sfx-steel-1.{ext}',OUT/f'sfx-steel.{ext}')
    (OUT/'sfx-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
