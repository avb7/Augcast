// Sidebar.js
// Our Navigation Center

import React from 'react';
import { database } from './../../../database/database_init';
import Spinner from 'react-spinkit';
import CourseList from './CourseList.js';
import LectureList from './LectureList.js';

class Sidebar extends React.Component {
    constructor(props) {
        super(props);

        // Initial state
        this.state = {
            loading: true
        };

        // course slection variable
        this.courses = undefined;

        // database query
        var that = this;
        database.ref('courses').once('value').then(function(snapshot) {
            that.courses = snapshot.val();
            that.setState({loading: false});
        });
    }

    render () {

        // loading
        if (this.state.loading) {
            return <Spinner className="sidebar-loading" spinnerName="three-bounce" />;
        }

        // render lecture list
        if (this.props.courseID) {
            return <LectureList course={this.courses[this.props.courseID]}
                                lectureID={this.props.lectureID}
                                courseID={this.props.courseID} />;
        }

        // render course list
        else {
            return <CourseList courses={this.courses} />;
        }
    }
}

export default Sidebar;
