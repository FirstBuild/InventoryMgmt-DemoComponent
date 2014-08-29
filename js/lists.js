// Functions for manipulating grocery lists (not the items in them)

/* data is an object with the following attributes:
    parent: Firebase name of parent container (false for root container) [required]
      - appended to "/containers/" to find parent
    owner: string - Firebase uid of container owner [required]
      - appended to "/users/" to find owner
    name: string - the name of the container [required]
    description: string - a description of the container [optional]
*/
function newList(data) {
  if (typeof data !== 'object') {
    return { success: false, message: 'newList requires an object as input' }
  }
  var newChild = InventoryManager['imRef'].child('containers').push(data);
  if (data['parent'] !== false) {
    var parentRef = InventoryManager['imRef'].child('containers/' + data['parent'] + '/children');
    var update = {};
    update[newChild.name()] = true;
    parentRef.update(update);
  }
  return newChild;
}

function deleteList(name) {
  var ref = InventoryManager['imRef'].child('containers').child(name);
  ref.once('value', function(v) {
    var parentName = v.val()['parent'];
    var parentRef = InventoryManager['imRef'].child('containers').child(parentName).child('children').child(v.name());
    parentRef.remove();
    ref.remove();
  });
}

// recursively descend through the container tree and identify all grocery lists
// adding them to the context array (InventoryManger['lists']) and adding listeners
// for their new children or removed children
function recurseContainers(ref, obj) {
  ref.once('value', function(v) {
    var listObj = {
      id: ref.name(),
      name: v.val()['name'],
      description: v.val()['description']
    };

    if(v.val()['compType'] && v.val()['compType'] == "grocery") {

      obj['groceryLists'].push(listObj);

      // if this is our first list, make it the active one
      if(obj['groceryLists'].length == 1) {
        displayGroceryList(listObj.id, true);
      }
      else
      {
        displayGroceryList(listObj.id, false);
      }
    }
    obj['all'].push(listObj);
  }, obj);
  var ch = ref.child('children');
  ch.on('child_added', function(snap) {
    recurseContainers(snap.ref().root().child('containers').child(snap.name()), this);
  }, obj);
  ch.on('child_removed', function(snap) {
    var list = this;
    $.each(list, function(index, value) {
      // see if the removed child was one of the grocery lists and remove it
      // from the InventoryManager['lists'] object if it was
      if (value['id'] === snap.name()) { list.splice(index,1) }
    });
  }, obj);
}

// starting at the logged-in user's rootContainer, enumerate all child
// containers using the recurseContainers helper
function getUserLists() {
  if (!InventoryManager['uid']) {
    flash('danger', 'You must be logged in to retrieve Grocery Lists.');
    return false;
  }
  InventoryManager['containers'] = {};
  InventoryManager['containers']['groceryLists'] = [];
  InventoryManager['containers']['all'] = [];

  var rootRef = InventoryManager['imRef'].child('containers').child(InventoryManager['rootContainer']).child('children');
  rootRef.on('child_added', function(v) {
    var contRef = InventoryManager['imRef'].child('containers').child(v.name());
    recurseContainers(contRef, this);
  }, InventoryManager['containers']);
  // if we have no grocery lists, flash message
  
  return true;
}
