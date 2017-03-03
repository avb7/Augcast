// Upload.js
// Responsible for uploading the PDF

import React from 'react';
import { firebaseApp, storageRef, database } from './../../database/database_init';
import { ProgressBar, Button, Glyphicon } from 'react-bootstrap';


class Upload extends React.Component {

    constructor(props) {
        super(props);

        // Initial state
        this.state = {
            uploadProgress: 0,
            uploadStarted: false,
            downloadURL: '',
            error: '',
            APIresult: '',
            lectureID: ''
        };

        // Bind all functions so they can refer to "this" correctly
        //this.togglePlay = this.togglePlay.bind(this);
        this.handleFile = this.handleFile.bind(this);
        this.handleClear = this.handleClear.bind(this);
        this.callLabelAPI = this.callLabelAPI.bind(this);
    }

    /**
     * Upload the inputted file to Firebase Storage.
     */
    handleFile() {
        let that = this;

        // The inputted file
        var file = this.refs.inputBox.files[0];

        // Ignore click if no file chosen
        if (file === undefined) {
            return;
        }

        // Check for .pdf extension. Weak method of checking filetype, but it's
        // the best we can do in the front end.
        if (!file.name.endsWith('.pdf')) {
            console.log('This is not a PDF file');
            this.setState({error: 'The input is not a PDF file!'});
            return;
        }

        console.log('User inputted file:' + file.name);
        this.setState({
            uploadStarted: true,
            error: ''
        });

        // Declare file to be PDF
        var metadata = {
            contentType: 'application/pdf'
        };
        // Upload the file and metadata to pdf/filename path in FB Storage
        var uploadTask = storageRef.child('test/pdf/' + file.name).put(file, metadata);

        // Listener for state changes, errors, and completion of the upload
        uploadTask.on(firebaseApp.storage.TaskEvent.STATE_CHANGED,
            function(snapshot) {
                var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                that.setState({
                    uploadProgress: progress
                });
                // Get upload progress
            }, function (error) {
                // Handle errors in upload
                console.log('Error in FBS upload: ' + error.code);
            }, function () {
                // Upload successful, get download URL
                console.log('Upload successful!');
                var url = uploadTask.snapshot.downloadURL;
                that.setState({
                    downloadURL: url
                });

                // Call the label API with the new download URL
                that.callLabelAPI(url);
                console.log('Download URL: ' + url);
            });

    }

    callLabelAPI(url) {

        // Query for the course's media URL
        database.ref('/lectures/' + this.state.lectureID + '').once('value')
        .then(function(snapshot) {


            var that = this;
            fetch('http://localhost:8080/api/label', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pdf: url,
                    media: snapshot.val().mediaURL,
                    lectureID: this.state.lectureID
                })
            }).then(function(response) {
                return response.json();
            }).then(function(j) {
                that.setState({APIresult: j.message});
            });
        });


    }

    handleClear() {
        this.refs.inputForm.reset();
        this.setState({
            uploadProgress: 0,
            uploadStarted: false,
            downloadURL: '',
            error: ''
        });
    }

    render () {
        console.log('Rendering Upload page');
        return (
            <div
            style={{maxWidth: '500px', margin:'0 auto'}}>

                <h3>
                    Upload a PDF file
                </h3>
                <p>
                    There are no slides for this lecture yet.
                    Upload the PDF here for the system to automatically generate
                    timestamps for each slide!
                </p>
                <form
                    ref='inputForm'>
                <input
                    ref='inputBox'
                    type='file'
                    style={{margin:'10px'}}
                    accept='application/pdf'/>

                <Button
                    bsStyle="default"
                    bsSize="small"
                    style={{margin:'10px'}}
                    active={this.state.curSource == 2}
                    onClick={this.handleClear}>
                        Clear
                </Button>
                <Button
                    bsStyle="success"
                    bsSize="small"
                    style={{margin:'10px'}}
                    active={this.state.curSource == 2}
                    onClick={this.handleFile}>
                        <Glyphicon glyph="cloud-upload" />
                        Upload
                </Button>
                </form>
                {this.state.error}

                {this.state.uploadStarted != 0 ? <ProgressBar
                    active
                    now={this.state.uploadProgress}
                    label={`${(this.state.uploadProgress).toFixed(2)}%`} /> : ''}

                <h3> {this.state.downloadURL != '' ? 'Download URL from Firebase:' : ''} </h3>
                <a href={this.state.downloadURL}> {this.state.downloadURL} </a>

                <h3> Call label API </h3>
                <Button
                    bsStyle="default"
                    bsSize="small"
                    style={{margin:'10px'}}
                    active={this.state.curSource == 2}
                    onClick={this.callLabelAPI}>
                        POST
                </Button>
                <h4>Response received: </h4>{this.state.APIresult}
            </div>
        );
    }
}

export default Upload;
