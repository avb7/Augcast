// Initialize and authenticate Firebase client
var merge = require('deepmerge');
var admin = require('firebase-admin');
var serviceAccount = require('../database/serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://augcast-465ef.firebaseio.com'
});
var adminDatabase = admin.database();
var fs = require('fs');

const QUEUE = './queue.json';
const {spawn} = require('child_process');

// Run the podcast.ucsd.edu scraper to generate the most updated json
console.log('[SCRAPE] Scraping podcast.ucsd.edu...');
let proc = spawn('./UCSDPodcastScraper.py');

// Once python script finishes, update database with new lectures
proc.stdout.on('data', function(buffer) {
    let pythonStdout = buffer.toString();
    console.log('[SCRAPE] ' + pythonStdout);

    // Collect new json object created by the scraper
    let courses = require('./courses.json');
    let lectures = require('./lectures.json');

    // Update the database with the merged objects
    updateDatabaseObject('courses', courses, false, null);
    updateDatabaseObject('lectures', lectures, true, (status) => {
        process.exit(status);
    });

});

/**
* Deep merges toMerge into the object at the Firebase path specified by
* objectKey and updates Firebase with the newly merged object.
* Finds the diff between the old and merged objects and creates a queue
* for the OCR backend.
*
* @param  {String}   objectKey     Path to JSON object in Firebase to merge into
* @param  {Object}   toMerge       The JSON Object to merge
* @param  {Boolean}  toCreateQueue Whether or not to create a queue for the OCR backend from this diff
* @param  {Function} callback      Function that executes upon completion
* @return {None}
*/
function updateDatabaseObject(objectKey, toMerge, toCreateQueue, callback) {
    adminDatabase.ref(objectKey).once('value').then(function(snapshot) {

        console.log('[UPDATE] on ' + objectKey + ', queue=' + toCreateQueue);

        // Merge DB object with newly scraped json
        let current = snapshot.val();
        // console.log('CURRENT ' + objectKey);
        // console.log(JSON.stringify(current, null, 4));

        var merged = current == null ? toMerge : merge(current, toMerge);
        console.log('[UPDATE] Merged', objectKey);


        // console.log('MERGED' + objectKey);
        // console.log(JSON.stringify(merged, null, 4));

        let toUpdateDB = true;

        // Create queue for the OCR engine if requested
        if (toCreateQueue) {
            // Get difference between current DB and merged lectures
            let delta = current == null ? merged : diff(current, merged);

            // console.log('Current', JSON.stringify(current, null, 4));
            // console.log('Merged', JSON.stringify(merged, null, 4));
            // console.log('Diff', JSON.stringify(delta, null, 4));


            let toWrite = {inProgress: false};
            toWrite.lectures = delta;
            toWrite.modified = new Date().toISOString().replace('T', ' ').replace(/\..*$/, '');

            console.log('[UPDATE] Ready to save queue', objectKey);

            // Create queue file on disk
            let queue = fs.existsSync(QUEUE) ? require(QUEUE) : null;
            if (
                queue == null ||
                queue.inProgress == null ||
                queue.inProgress == false ||
                queue.inProgress == 'false') {
                fs.writeFile(QUEUE, JSON.stringify(toWrite, null, 4), 'utf8', function (err) {
                    if (err) {
                        console.err('Error saving queue: ' + err);
                        return console.log(err);
                    }
                    console.log('[UPDATE] Queue saved!');
                });
            }

            // Queue is still being processed, do not overwrite queue or update DB
            // (can't update DB because if we do, the current changes will not
            // show up in the next run of this script (because they would exist
            // in the DB), so OCR will never run on those lectures. DB will be
            // updated the next time this script runs and the queue isn't busy.)
            else {
                toUpdateDB = false;
                console.log('[UPDATE] Queue inProgress is true, not updating queue or DB!');
            }

            // console.log('[UPDATE] DELTA ' + objectKey);
            // console.log('[UPDATE] Queue has size ' + Object.keys(delta).length);
            // console.log(JSON.stringify(delta, null, 4));
        }

        // Update DB with merged object if queue creation didn't fail
        if (toUpdateDB) {
            console.log('[UPDATE] Ready to update db', objectKey);


            fs.writeFile('./merged_' + objectKey + '.json', JSON.stringify(merged, null, 4), 'utf8', function (err) {
                if (err) {
                    console.err('Error saving merged: ' + err);
                    return console.log(err);
                } else {
                    console.log('[UPDATE] Merged ' + objectKey + ' saved to disk!');

                    //firebase-import --database_url https://augcast-465ef.firebaseio.com/ --path /test/ --json merged_lectures.json --service_account ../database/serviceAccountKey.json
                    const child = spawn('firebase-import',
                        ['--database_url', 'https://augcast-465ef.firebaseio.com/',
                            '--path', '/' + objectKey + '/',
                            '--json', './merged_' + objectKey + '.json',
                            '--force',
                            '--service_account', '../database/serviceAccountKey.json']);

                    child.stdout.on('data', (chunk) => {
                        console.log(chunk.toString());
                    });

                    child.stderr.on('data', (chunk) => {
                        console.error(chunk.toString());
                    });

                    child.on('close', (code) => {
                        console.log(`child process exited with code ${code}`);

                        if (callback) callback(code);
                    });

                }
            });

        } else {
            if (callback) callback(0);
        }
    });
}

var diff = function(current, merged) {
    let delta = {};
    // Courses to skip
    const TO_SKIP = ['chem6a'];

    for (var course in merged) {
        // console.log("On course", course, " in merged");

        var skipThisCourse = false;
        for (var skip in TO_SKIP) {
            if (course.startsWith(TO_SKIP[skip])) {
                skipThisCourse = true;
                break;
            }
        }

        if (skipThisCourse) continue;

        for (var lecture in merged[course]) {
            // console.log("On lecture", lecture, " in ", course);
            if (merged[course][lecture].hasOwnProperty('timestamps') ||
                merged[course][lecture].hasOwnProperty('skip') ||
                merged[course][lecture].video_url.endsWith('mp3')) {
                // console.log("Lecture", lecture, "has timestamps!");
            } else {
                // console.log("Lecture", lecture, "has NO timestamp=!");
                if (!delta.hasOwnProperty(course)) {
                    delta[course] = {};
                }

                delta[course][lecture] = merged[course][lecture];
            }
        }
    }
    return delta;
};
