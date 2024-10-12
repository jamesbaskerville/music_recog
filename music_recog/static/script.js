console.log("Music Recognition app loaded!");


// Make sure to include the RecordRTC library in your HTML file:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/RecordRTC/5.6.2/RecordRTC.min.js"></script>

let recorder;
let audioStream;

function startRecording() {
    document.getElementById('startRecording').style.display = 'none';
    document.getElementById('listening').style.display = 'block';

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioStream = stream;
            recorder = RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/wav',
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 44100,
                bitsPerSample: 16,
                sampleRate: 44100
            });
            recorder.startRecording();

            // Automatically stop recording after 5 seconds
            setTimeout(() => {
                stopRecording();
            }, 5000);
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            document.getElementById('result').textContent = 'Error: Unable to access microphone';
            stopRecording();
            document.getElementById('startRecording').style.display = 'inline-block';
            document.getElementById('listening').style.display = 'none';
        });
}

function stopRecording() {
    if (recorder) {
        recorder.stopRecording(() => {
            let blob = recorder.getBlob();
            showLoading()
            sendAudioToServer(blob);
            
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }
        });
        document.getElementById('listening').style.display = 'none';
        document.getElementById('startRecording').style.display = 'inline-block';
    }
}

function updateResult(data) {
    const songInfo = document.getElementById('song-info');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const albumArt = document.getElementById('album-art');
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    const songAlbum = document.getElementById('song-album');
    const songGenre = document.getElementById('song-genre');
    const songReleaseDate = document.getElementById('song-release-date');
    // const songLinks = document.getElementById('song-links');
    const songLyrics = document.getElementById('song-lyrics');

    loading.style.display = 'none';
    error.style.display = 'none';
    songInfo.style.display = 'none';

    if (data.error) {
        error.textContent = data.error;
        error.style.display = 'block';
    } else {
        albumArt.src = data.images.coverart || data.images.coverarthq || data.images.background;
        songTitle.textContent = data.title;
        songArtist.textContent = data.artist;
        songAlbum.textContent = data.album;
        songGenre.textContent = `Genre: ${data.genre}`;
        songReleaseDate.textContent = `Release Date: ${data.release_date}`;

        // // Create links
        // songLinks.innerHTML = '';
        // if (data.url) {
        //     songLinks.innerHTML += `<a href="${data.url}" target="_blank">View on Shazam</a><br>`;
        // }
        // if (data.spotify) {
        //     songLinks.innerHTML += `<a href="${data.spotify}" target="_blank">Open in Spotify</a><br>`;
        // }
        // if (data.apple_music) {
        //     songLinks.innerHTML += `<a href="${data.apple_music}" target="_blank">Open in Apple Music</a><br>`;
        // }

        // Display lyrics if available
        if (data.lyrics && data.lyrics.length > 0) {
            songLyrics.innerHTML = '<h3>Lyrics:</h3>' + data.lyrics.map(line => `<p>${line}</p>`).join('');
        } else {
            songLyrics.innerHTML = '<p>Lyrics not available</p>';
        }

        songInfo.style.display = 'block';
    }
}

// This function should be called when starting the recognition process
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('song-info').style.display = 'none';
    document.getElementById('error').style.display = 'none';
}

function sendAudioToServer(audioBlob) {
    // Create a download button for the WAV file
    /*
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download Recording (WAV)';
    downloadButton.onclick = function() {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'recorded_audio.wav';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    };
    
    // Add the download button to the page
    const downloadDiv = document.getElementById('downloadButton');
    downloadDiv.innerHTML = ''; // Clear previous buttons
    downloadDiv.appendChild(downloadButton);
    */

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    fetch('/recognize', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(result => {
        if (result.error) {
            throw new Error(result.error);
        }
       
        console.log(result)
        updateResult(result)
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('result').textContent = 'Error recognizing audio: ' + error.message;
    });
}



document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);
