// functions for manipulating grocery list items

function addGroceryListItem(container, item) {
  var ref = InventoryManager['imRef'];
  // construct the item to be added to the /objects tree
  var glItem = {
    container: container,
    data: item,
    checked: false
  };
  // add it to the tree, and capture a ref to it
  var newObj = ref.child('objects').push(glItem);
  if (newObj.name().length > 0) {
    // create an object to add to the objects index for the container
    // if we successfully created the new object
    var containerIndexValue = {};
    containerIndexValue[newObj.name()] = true;
    // update() here so we don't overwrite other items in the index
    var containerRef = ref.child('containers/' + container);
    containerRef.child('objects').update(containerIndexValue);

    // clear new item input box
    $('#' + container + 'NewListItem').val('');
  }
}

function toggleGroceryListItemStatus(name) {
  var ref = InventoryManager['imRef'].child('objects/' + name + '/checked');
  ref.once('value', function(v) {
    // if the checked value does not exist, assume it's currently not checked
    var current = v.val() === null ? false : v.val();
    ref.set(!current);
  });
}

function removeGroceryListItem(name) {
  var ref = InventoryManager['imRef'].child('objects/' + name);
  // get the value of our item ref
  ref.once('value', function(v) {
    // find the container so we can update its /objects index
    var c = v.val()['container'];
    ref.root().child('containers/'+ c + '/objects/' + ref.name()).remove();
    ref.remove();
  });
}

// this function will display a grocery list and call displayGroceryListItems to display their contents.
// In order to show multiple grocery lists, call this function once for each list
// name - the firebase generated name of the grocery list container
// active - whether the list will be displayed on the screen. Only one list should be active
function displayGroceryList(name, active) {

  var ref = InventoryManager['imRef'].child('containers/' + name);
  ref.once('value', function(v) {
    if (v.val() === null) {
      flash('danger', 'Grocery List ' + name + ' was not found.');
    }
    else {
      var activeClass = ''
      if(active == true) {
        activeClass = 'active'
      }
      // add Grocery List tab to markup
      var tabItemMarkup = '<li class="'+ activeClass + '" id="'+v.name()+'li"><a data-toggle="#' + v.name() +'tabcontent" href="#' + v.name() +'tabcontent">' + v.val()['name'] + '</a></li>';
      $('#listTabs').append(tabItemMarkup);

      // setup click handler so we actually change tabs on click
      $('#listTabs a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
      })

      // function to handle displaying the items
      displayGroceryListItems(ref, active);
    }
  });
}

// this function will display the items in a grocery list container
// containerFbRef - firebase ref to the grocery list container
// active - whether the list will be displayed on the screen. Only one list should be active
function displayGroceryListItems(containerFbRef, active) {
  // the containers objects child node contains the references to the actual grocery items
  var groceryItems = containerFbRef.child('objects/');

  var activeClasstext = ''
  if(active == true) {
    activeClasstext = 'active in'
  }
  var tabContentMarkup = '<div class="tab-pane panel panel-default panel-body fade '+activeClasstext+'" id= "' + containerFbRef.name() +'tabcontent"><table class="table table-condensed" id="'+containerFbRef.name()+'Content"><tr><td><input id = "'+containerFbRef.name()+'NewListItem" type="text" class="form-control" placeholder="New Item" required></td><td><button onclick="addGroceryListItem(\''+containerFbRef.name()+'\', $(\'#'+containerFbRef.name()+'NewListItem\').val())" class="btn btn-primary" >Add </button></td><td>&nbsp;</td></tr></table></div>';
  $('#tabContents').append(tabContentMarkup);

  // if a grocery item is added, update the DOM. Note: on first run, this will run once for each grocery list item
  groceryItems.on('child_added', function(dataSnapshot) {
    var groceryItem = InventoryManager['imRef'].child('objects/' + dataSnapshot.name());
    // for eahc grocery item, build out the DOM
    groceryItem.once('value', function(dataSnapshot) {
      var tabContentDataMarkup = '<tr id="'+ dataSnapshot.name() +'row">' + groceryListMarkupHelper(dataSnapshot) + '</tr>';
      $('#' + containerFbRef.name() + 'Content').prepend(tabContentDataMarkup);
    });

    // if a grocery item changes, update the DOM
    groceryItem.on('child_changed', function(childSnapshot, prevChildName) {
      groceryItem.once('value', function(dataSnapshot) {
        // replace the contents of the <tr> with the updated data
        $("#" + groceryItem.name()+'row').html(groceryListMarkupHelper(dataSnapshot));
      });
    });
  });

  // if grocery items are removed, update the DOM
  groceryItems.on('child_removed', function(dataSnapshot) {
    // remove from DOM
    $('#' + dataSnapshot.name() + 'row').remove();
  });

}

// helper function for generating markup
function groceryListMarkupHelper(data) {

  if(data.val()['checked'] == true) {
    var itemButtonMarkup = '<td><s><b>'+ data.val()['data'] +'</b></s></td><td><button onclick = "toggleGroceryListItemStatus(\''+data.name()+'\')" class="btn btn-primary"> Uncheck </button></td><td><button onclick= "removeGroceryListItem(\''+data.name()+'\')" class="btn btn-primary"> Remove </button></td>';
  }
  else {
    var itemButtonMarkup = '<td><b>'+ data.val()['data'] +'</b></td><td><button onclick = "toggleGroceryListItemStatus(\''+data.name()+'\')" class="btn btn-primary"> Check </button></td><td><button onclick= "removeGroceryListItem(\''+data.name()+'\')" class="btn btn-primary"> Remove </button></td>';
  }
  return itemButtonMarkup;
}
