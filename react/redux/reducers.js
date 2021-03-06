import { DISPLAY_LECTURE, LOG_OUT, LOG_IN_SUCCESS,LOG_IN_FAILURE,
         LOG_IN_REQUEST, NAVIGATE_COURSE, IS_INSTRUCTOR, UPDATE_USER,
         SKIP_TO_TIME, UPDATE_SEARCH_SLIDES, UPDATE_JUMP_SLIDE} from './actions';

/**
* state of the app
* loggedIn: true if user is logged in, false otherwise
* currentCourse: ID of the course currently selected
* slides: all matched slides of the lecture
* slide: the slide that was clicked in the search results
*/
const initialState = {
    isFetching: false,
    loggedIn : false,
    navCourse: undefined,
    currentCourse: undefined,
    currentLecture: undefined,
    currentTime: 0,
    userType: 'STUDENT',
    username: undefined,
    searchSlides: [],
    jumpSlide: undefined
};


/**
* reducers for our app
* LOG_OUT: returns state with loggedIn as false
* LOG_IN: returns state with loggedIn as true
* UPDATE_COURSE: returns state with currentCourse set to the current courseId
*/
function appReducers (state, action) {

    if (typeof state === 'undefined') {
        return initialState;
    }

    switch (action.type) {

    case LOG_OUT: {
        return Object.assign ({}, state, {
            loggedIn: false,
            username: undefined,
        });
    }

    case LOG_IN_SUCCESS: {
        return Object.assign ({}, state, {
            loggedIn: true,
            isFetching: false
        });
    }

    case LOG_IN_FAILURE: {
        return Object.assign ({}, state, {
            loggedIn: false,
            isFetching: false

        });
    }

    case LOG_IN_REQUEST: {
        return Object.assign ({}, state, {
            isFetching: true
        });
    }

    case NAVIGATE_COURSE: {
        return Object.assign({}, state, {
            navCourse: action.navCourse
        });
    }

    case DISPLAY_LECTURE: {
        return Object.assign ({}, state, {
            currentCourse: action.currentCourse,
            currentLecture: action.currentLecture
        });
    }

    case SKIP_TO_TIME: {
        return Object.assign({}, state, {
            currentTime: action.currentTime
        });
    }

    case IS_INSTRUCTOR: {
        return Object.assign ({}, state, {
            userType: 'INSTRUCTOR'
        });
    }

    case UPDATE_USER: {
        return Object.assign ({}, state, {
            username: action.username
        });
    }

    case UPDATE_SEARCH_SLIDES: {
        return Object.assign ({}, state, {
            searchSlides: action.slides,
            jumpSlide: action.slide
        });
    }

    case UPDATE_JUMP_SLIDE: {
        return Object.assign ({}, state, {
            jumpSlide: action.slide
        });
    }

    }

    return state;
}

export default appReducers;
