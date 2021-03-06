Tasks = new Mongo.Collection("tasks");
Lists = new Meteor.Collection("lists");
if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        {private: {$ne: true}},
        {owner: this.userId}
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.tasks.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var text = event.target.text.value;

      //call addtask method
      Meteor.call('addTask',text);
 
      // Clear form
      event.target.text.value = "";
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.addList.events({
    'submit .new-list': function(event){
      event.preventDefault();

      var listName = $('[name="listName"]').val();

      Lists.insert({
        name: listName
      });

      $('[name="listName"]').val("");
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call('setChecked',this._id,! this.checked);
    },
    "click .delete": function () {
      Meteor.call('deleteTask',this._id);
    },
    "click .toggle-private": function(){
      Meteor.call('setPrivate',this._id,! this.private);
    }
  });

  Template.navigation.events({
    'click .logout':function(e){
      e.preventDefault();
      Meteor.logout(function(error){
        if(error)
          console.log(error);
        else
          Router.go('login');
      });
    }
  });

  // This code only runs on the client
  Template.tasks.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.register.events({
    'submit form':function(e){
      e.preventDefault();
      var username = $('[name="username"]').val();
      var passw = $('[name="password"]').val();
      //create a user
      Accounts.createUser({username: username, password: passw},function(errors){
        if(errors)
          console.log(errors);
        else
          Router.go('home');
      });
    }
  });

  Template.login.events({
    'submit form':function(e){
      e.preventDefault();

      var username = $('[name="username"]').val();
      var password = $('[name="password"]').val();
      //login the user
      Meteor.loginWithPassword(username, password, function(error){
        if(error)
          console.log(error);
        else
          Router.go('tasks');
      });
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    }, function(errors, _id){
      Router.go('tasks', {_id: _id});
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);

    //make sure it is the task owner
    if(task.private && task.owner !== Meteor.userId()){
      throw new Meteor.error('not-authorized');
    }else if(task.owner == Meteor.userId){
      Tasks.remove(taskId);
    }
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);

    //make sure it is the task owner
    if(task.private && task.owner !== Meteor.userId()){
      throw new Meteor.error('not-authorized');
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function(taskId, setToPrivate){
    var task = Tasks.findOne(taskId);

    //make sure it is the task owner
    if(task.owner !== Meteor.userId()){
      throw new Meteor.error('not-authorized');
    }

    Tasks.update(taskId, {$set: {private: setToPrivate} });
  }
});


//Routing
Router.route('/',{
  name: 'home',
  template: 'home'
});
Router.route('/register');
Router.route('/login');
Router.route('/tasks');
Router.configure({
  layoutTemplate: 'main'
});
Router.route('tasks/:_id',{
  template: 'taskitem',
  data: function(e, tempalte){
    var currentTask = this.params._id;
    return Tasks.findOne({_id: currentTask});
  }
});