/*global RideFlow _config AmazonCognitoIdentity AWSCognito*/

var RideFlow = window.RideFlow || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';
    var registerUrl = '/register.html';
    var verifyUrl = '/verify.html';
    var homeUrl = '/ride.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region)) {
        $('#noCognitoMessage').show();
        console.error('Cognito configuration is incomplete. Please check js/config.js');
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    RideFlow.signOut = function signOut() {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
            console.log('User signed out successfully');
            window.location.href = signinUrl;
        }
    };

    RideFlow.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    console.error('Session error:', err);
                    reject(err);
                } else if (!session.isValid()) {
                    console.log('Session is not valid');
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            console.log('No current user');
            resolve(null);
        }
    });


    /*
     * Cognito User Pool functions
     */

    function register(email, password, onSuccess, onFailure) {
        var dataEmail = {
            Name: 'email',
            Value: email
        };
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

        userPool.signUp(toUsername(email), password, [attributeEmail], null,
            function signUpCallback(err, result) {
                if (!err) {
                    onSuccess(result);
                } else {
                    onFailure(err);
                }
            }
        );
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure,
            newPasswordRequired: function(userAttributes, requiredAttributes) {
                // User was signed in by an admin and must provide a new password
                console.log('New password required');
                onFailure(new Error('New password required. Please contact support.'));
            }
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    function getCurrentUser() {
        return userPool.getCurrentUser();
    }

    function isAuthenticated() {
        var cognitoUser = getCurrentUser();
        if (!cognitoUser) {
            return false;
        }
        
        var isAuthenticated = false;
        cognitoUser.getSession(function(err, session) {
            if (session && session.isValid()) {
                isAuthenticated = true;
            }
        });
        return isAuthenticated;
    }

    RideFlow.getCurrentUser = getCurrentUser;
    RideFlow.isAuthenticated = isAuthenticated;

    /*
     *  Event Handlers
     */

    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
    });

    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        event.preventDefault();
        
        // Basic validation
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        signin(email, password,
            function signinSuccess(result) {
                console.log('Successfully Logged In', result);
                window.location.href = homeUrl;
            },
            function signinError(err) {
                console.error('Sign in error:', err);
                var message = err.message || err.code || 'Sign in failed. Please try again.';
                if (err.code === 'UserNotConfirmedException') {
                    message = 'Please verify your account first. Check your email for the verification code.';
                    window.location.href = verifyUrl;
                } else if (err.code === 'NotAuthorizedException') {
                    message = 'Incorrect email or password.';
                } else if (err.code === 'UserNotFoundException') {
                    message = 'No account found with this email.';
                }
                alert(message);
            }
        );
    }

    function handleRegister(event) {
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();

        var onSuccess = function registerSuccess(result) {
            var cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());
            alert('Registration successful. Please check your email inbox or spam folder for your verification code.');
            window.location.href = verifyUrl;
        };
        var onFailure = function registerFailure(err) {
            console.error('Registration error:', err);
            var message = err.message || err.code || 'Registration failed. Please try again.';
            if (err.code === 'UsernameExistsException') {
                message = 'An account with this email already exists.';
            } else if (err.code === 'InvalidPasswordException') {
                message = 'Password does not meet requirements. Please use a stronger password.';
            }
            alert(message);
        };
        event.preventDefault();

        // Validation
        if (!email || !password || !password2) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== password2) {
            alert('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        register(email, password, onSuccess, onFailure);
    }

    function handleVerify(event) {
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();
        event.preventDefault();
        
        // Basic validation
        if (!email || !code) {
            alert('Please enter both email and verification code');
            return;
        }
        
        verify(email, code,
            function verifySuccess(result) {
                console.log('call result: ' + result);
                console.log('Successfully verified');
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                console.error('Verification error:', err);
                var message = err.message || err.code || 'Verification failed. Please try again.';
                if (err.code === 'CodeMismatchException') {
                    message = 'Invalid verification code. Please check and try again.';
                } else if (err.code === 'ExpiredCodeException') {
                    message = 'Verification code has expired. Please register again.';
                    window.location.href = registerUrl;
                }
                alert(message);
            }
        );
    }
}(jQuery));
