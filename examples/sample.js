


function brandon() {
  console.log(arguments);
}


function anna() {
  brandon.apply(this, arguments);
}


anna('You', 'are', 'sweet')