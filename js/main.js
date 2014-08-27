/*
  main.js - Javascript functions for managing the web interface and setting up
  the Firebase auth service
*/

// create a namespace for our globals
var InventoryManager = {
  appURI: "https://flickering-fire-3648.firebaseio.com/"
};

function initAuth(ref) {
  return new FirebaseSimpleLogin(ref, function(error, user) {
    if (error) {
      switch(error.code) {
        case "INVALID_USER":
          flash('warning', 'That user does not exist. Please register a new account.');
          $('input[type="email"]').focus();
          return false;
        case "INVALID_PASSWORD":
          flash('danger','Invalid password entered! Please correct your password.');
          $('input:password').focus();
          return false;
        default:
          flash('danger', 'An unknown authentication error occured.');
          return false;
      }
    }
    else if(user) {
      // user logged in
      InventoryManager['uid'] = user.uid;
      var userRef = ref.child('users').child(user.uid);
      userRef.once('value', function(snap) {
        if (snap.val() === null) {
          // create a user profile if it doesn't already exist
          // we can't do this on user creation because you have to be authenticated
          // in order to write to the /users node
          var rootCont = { name: user.uid+'_root', description: 'root container', parent: false, owners: {} };
          rootCont['owners'][user.uid] = true;
          var contRef = ref.child('containers').push(rootCont, function(err) {
            if (err) {
              flash('danger', 'Failed to create root container for new user.');
              return false;
            } else {
              InventoryManager['rootContainer'] = contRef.name();
              userRef.set({displayName: user.email, email: user.email, provider: user.provider, provider_id: user.id, rootContainer: contRef.name()});
            }
          });
        } else {
          // store root container name
          InventoryManager['rootContainer'] = snap.val()['rootContainer'];
        }
      });
      $("#signin-form").hide();
      $("#profile-link").html('<a href="#">' + user.email + '</a>');
      $("ul.masthead-nav").append('<li id="logout"><a href="#">Logout</a></ul>');

      $('#lists').show();

      // todo: for now, hard code grocery list until that functionality is complete
      displayGroceryList('-JUe8qcgJOZsHYZCogge', true);
    }
    else {
      // user logged out
      $('li').remove('#logout');
      $("#signin-form").show();
      $("#profile-link").html('<a href="#">Not Logged In</a>');
      $('#lists').hide();
    }
  });
}

function flash(sev, msg) {
  // see if we know what severity level this should be
  if ($.inArray(sev, ["success", "warning", "danger", "info"]) < 0) {
    // default to info
    sev = "info";
  }
  html = '<div class="alert alert-' + sev + ' alert-dismissible" role="alert">';
  html += '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>';
  html += msg + '</div>';

  // now flash the message
  $('#flash').append(html);
}

// signin form submit handler
$('#signin-form').submit(function(e) {
  e.preventDefault();
  InventoryManager['auth'].login('password', { email: $('input[type="email"]').val(), password: $('input:password').val() });
});

// logout link handler
$('ul.masthead-nav').on('click', 'li#logout', function() {
  InventoryManager['auth'].logout();
});

// initialize the master Firebase ref and the auth service once the document
// is loaded
$(document).ready(function() {
  InventoryManager['imRef'] = new Firebase(InventoryManager['appURI']);
  InventoryManager['auth'] = initAuth(InventoryManager['imRef']);
});
