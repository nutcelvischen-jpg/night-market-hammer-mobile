#!/usr/bin/env python3
"""OpenRouter PCM → trimmed MP3, adapted from shotgameskill/tts_openrouter.py.

OPENROUTER_API_KEY must be in the environment; no secrets in browser assets.
Usage: python3 scripts/generate_voice.py [intro success ...]
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]

def main():
    key = os.environ.get('OPENROUTER_API_KEY', '')
    if not re.fullmatch(r'sk-or-v1-[0-9a-f]{64}', key):
        sys.exit('Missing or invalid OPENROUTER_API_KEY environment variable')
    cfg = json.loads((ROOT / 'voice_lines.json').read_text())
    selected = set(sys.argv[1:]) or set(cfg['lines'])
    if selected - set(cfg['lines']):
        sys.exit('Unknown voice line ID')
    output = ROOT / 'voice'
    output.mkdir(exist_ok=True)
    for name, line in cfg['lines'].items():
        if name not in selected:
            continue
        # curl reads authorization from stdin, never from visible process argv.
        with tempfile.TemporaryDirectory(prefix='hammer-tts-') as tmp:
            body = Path(tmp) / 'request.json'
            pcm = Path(tmp) / 'speech.pcm'
            encoded = Path(tmp) / 'speech.mp3'
            body.write_text(json.dumps({'model': cfg['model'], 'input': line['text'],
                                       'voice': line['voice'], 'response_format': 'pcm'}))
            result = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '120',
                '--config', '-', '--output', str(pcm), '--write-out', '%{http_code}',
                '--data-binary', '@' + str(body), 'https://openrouter.ai/api/v1/audio/speech'],
                input=f'header = "Authorization: Bearer {key}"\nheader = "Content-Type: application/json"\n',
                capture_output=True, text=True)
            if result.returncode or result.stdout != '200':
                sys.exit(f'{name}: TTS request failed (HTTP {result.stdout or "unavailable"}); response not logged')
            if not pcm.exists() or pcm.stat().st_size < 4800 or pcm.stat().st_size % 2:
                sys.exit(f'{name}: invalid PCM response')
            filters = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
                       'silenceremove=start_periods=1:start_threshold=-45dB,areverse')
            if line.get('mastering') in ('boss_shout', 'boss_gravel'):
                filters += (',highpass=f=65,bass=g=2:f=140:w=0.7,'
                            'equalizer=f=2100:t=q:w=0.8:g=1.2,'
                            'acompressor=threshold=0.16:ratio=2.5:attack=5:release=90:makeup=1.35')
                if line['mastering'] == 'boss_shout':
                    filters += ',loudnorm=I=-14:TP=-1.5:LRA=7,aresample=24000'
            filters += ',alimiter=limit=0.84:level=false'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', '24000',
                '-ac', '1', '-i', str(pcm), '-af', filters, '-b:a', '96k', str(encoded)], check=True)
            info = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'default=nw=1:nk=1', str(encoded)], text=True).strip()
            duration = float(info)
            if not .3 <= duration <= 8:
                sys.exit(f'{name}: unexpected duration {duration:.2f}s; retained previous file')
            encoded.replace(output / f'{name}.mp3')
            print(f'{name}: {duration:.2f}s · {line["subtitle"]}', flush=True)

if __name__ == '__main__':
    main()
