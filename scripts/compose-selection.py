"""Render only the original character-selection theme; leave other tracks intact."""
from pathlib import Path
import importlib.util
import json

path=Path(__file__).with_name('compose-audio.py')
spec=importlib.util.spec_from_file_location('ho2_composition',path)
audio=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)
selection=dict(id='selection',title='Four Roads, One Promise',bpm=108,bars=32,
    tonic=57,major=False,progression=[0,3,5,4,2,5,1,4],lead=11,answer=73,style='camp')
audio.WORK.mkdir(parents=True,exist_ok=True)
score,info=audio.compose(selection)
(audio.SCORES/'music-selection.mid').write_bytes(score)
extended,_=audio.compose(selection,3)
report=audio.render_score('music-selection',extended,info)
(audio.SCORES/'selection-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
