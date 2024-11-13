(function($) {

	"use strict";

	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	$('#sidebarCollapse').on('click', function () {
      $('#sidebar').toggleClass('active');
  });

})(jQuery);

// _________________________________________ Start Dynamic Chat App Script _________________________________

function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
}

let userData = JSON.parse(getCookie('user'));

let sender_id = userData._id;
let receiver_id;
let global_group_id;
let socket = io('/user-namespace', {
	auth: {
		token: userData._id
	}
});

$(document).ready(function() {
	$('.user-list').click(function() {
		let userId = $(this).attr('data-id');
		receiver_id = userId;

		$('.start-head').hide();
		$('.chat-section').show();

		socket.emit('existsChat', { sender_id: sender_id, receiver_id: receiver_id });
	});
});

// get user online status
socket.on('getOnlineUser', function(data) {
	$('#'+data.user_id+'-status').text('Online');
	$('#'+data.user_id+'-status').removeClass('offline-status');
	$('#'+data.user_id+'-status').addClass('online-status');
})

// get user offline status
socket.on('getOfflineUser', function(data) {
	$('#'+data.user_id+'-status').text('Offline');
	$('#'+data.user_id+'-status').addClass('offline-status');
	$('#'+data.user_id+'-status').removeClass('online-status');
});

//save chat of user
$('#chat-form').submit(function(event) {
	event.preventDefault();

	let message = $('#message').val();

	$.ajax({
		url: '/save-chat',
		type: 'POST',
		data: { sender_id: sender_id, receiver_id: receiver_id, message: message },
		success: function(response) {
			if(response.success) {
				console.log("response", response)
				$('#message').val('');
				let chat = response.data.message;
				let html = `
					<div class="current-user-chat" id='`+response.data._id+`'>
						<h5><span>`+chat+`</span>
							<i class="fa fa-trash" aria-hidden="true" data-id='`+response.data._id+`' data-toggle="modal" data-target="#deleteChatModal"></i>
							<i class="fa fa-edit" aria-hidden="true" data-id='`+response.data._id+`' data-msg='`+chat+`' data-toggle="modal" data-target="#editChatModal"></i>
						</h5>
					</div>
				`;
				$('#chat-container').append(html);
				socket.emit('newChat', response.data);

				scrollChat();
			} else {
				alert(data.message);
			};
		},
	});
});

socket.on('loadNewChat', function(data) {
	if(sender_id == data.receiver_id && receiver_id == data.sender_id) {
		let html = `
			<div class="distance-user-chat" id='`+data._id+`'>
				<h5><span></span>`+data.message+`</span></h5>
			</div>
		`;
		$('#chat-container').append(html);
	}
	
	scrollChat();
})

// load old chats
socket.on('loadChats', function(data) {
	$('#chat-container').html('');

	let chats = data.chats;
	let html = '';

	for(let x = 0; x < chats.length; x++) {
		let addClass = '';
		if(chats[x]['sender_id'] == sender_id) {
			addClass = 'current-user-chat';
		} else {
			addClass = 'distance-user-chat';
		}

		html +=`
			<div class="`+addClass+`" id='`+chats[x]['_id']+`'>
				<h5><span>`+chats[x]['message']+`</span>`;
					if(chats[x]['sender_id'] == sender_id) {
						html +=`<i class="fa fa-trash" aria-hidden="true" data-id='`+chats[x]['_id']+`' data-toggle="modal" data-target="#deleteChatModal"></i>
							<i class="fa fa-edit" aria-hidden="true" data-id='`+chats[x]['_id']+`' data-msg='`+chats[x]['message']+`' data-toggle="modal" data-target="#editChatModal"></i>
						`;
					}
					html +=`
				</h5>
			</div>
		`;
	}

	$('#chat-container').append(html);

	scrollChat();
});

function scrollChat() {
	$('#chat-container').animate({
		scrollTop: $('#chat-container').offset().top + $('#chat-container')[0].scrollHeight
	}, 0);
}

// delete chat
$(document).on('click', '.fa-trash', function() {
	let msg = $(this).parent().text();
	$('#delete-message').text(msg);
	
	$('#delete-message-id').val($(this).attr('data-id'));
});

$('#delete-chat-form').submit(function(event) {
	event.preventDefault();

	let id = $('#delete-message-id').val();

	$.ajax({
		url: '/delete-chat',
		type: "POST",
		data: { id: id },
		success: function(res) {
			if(res.success == true) {
				$('#'+id).remove();
				$('#deleteChatModal').modal('hide');
				socket.emit('chatDeleted', id);
			} else {
				alert(res.msg);
			}
		}
	})
});

socket.on('chatMessageDeleted', function(id) {
	$('#'+id).remove();
});

// update user chat functionality
$(document).on('click', '.fa-edit', function() {
	$('#edit-message-id').val( $(this).attr('data-id') );
	$('#update-message').val( $(this).attr('data-msg') );
});

$('#update-chat-form').submit(function(event) {
	event.preventDefault();

	let id = $('#edit-message-id').val();
	let msg = $('#update-message').val();

	$.ajax({
		url: '/update-chat',
		type: "POST",
		data: { id: id, message: msg },
		success: function(res) {
			if(res.success == true) {
				$('#editChatModal').modal('hide');
				$('#'+id).find('span').text(msg);
				$('#'+id).find('.fa-edit').attr("data-msg", msg);
				socket.emit('chatUpdated', {id: id, message: msg});
			} else {
				alert(res.msg);
			}
		}
	})
});

socket.on('chatMessageUpdated', function(data) {
	$('#'+data.id).find('span').text(data.message);
});

// add member js
$('.addMember').click(function() {
	let id = $(this).attr('data-id');
	let limit = $(this).attr('data-limit');

	$('#group_id').val(id);
	$('#limit').val(limit);

	$.ajax({
		url: '/get-members',
		type: 'POST',
		data: { group_id: id },
		success: function(res) {
			if(res.success == true) {
				let users = res.data;
				console.log('res.data', res.data)
				let html = '';

				for(let i = 0; i < users.length; i++) {
					let isMemberOfGroup = users[i]['member'].length > 0 ? true : false;

					html += `
						<tr>
							<td>
								<input type="checkbox" `+(isMemberOfGroup ? 'checked' : '')+` name="members[]" value="`+users[i]['_id']+`"/>
							</td>
							<td>`+users[i]['name']+`</td>
						</tr>
					`
				}
				$('.addMemberInTable').html(html);
			} else {
				alert(res.msg)
			}
		}
	});
});

// add member form submit code
$('#add-member-form').submit(function(event) {
	event.preventDefault();

	let formData = $(this).serialize();

	$.ajax({
		url: "/add-members",
		type: "POST",
		data: formData,
		success: function(res) {
			if(res.success ) {

				$("#memberModal").modal("hide");
				$('#add-member-form')[0].reset();
				alert(res.msg)

			} else {

				$('#add-member-error').text(res.msg);
				setTimeout(() => {
					$("#add-member-error").text('');
				}, 3000);

			}
		}
	});
});

//update member script
$('.updateMember').click(function() {
	let obj = JSON.parse($(this).attr('data-obj'));

	$('#update_group_id').val(obj._id);
	$('#last_limit').val(obj.limit);
	$('#group_name').val(obj.name);
	$('#group_limit').val(obj.limit);
});

// update Chat Group
$('#updateChatGroupForm').submit(function(e) {
	e.preventDefault();

	$.ajax({
		url: "/update-chat-group",
		type: "POST",
		data: new FormData(this),
		contentType: false,
		cache: false,
		processData: false,
		success: function(res) {
			alert(res.msg)
			if(res.success) {
				location.reload();
			}
		}
	})
});

///////////////////// delete group chat ////////////////////////////
$('.deleteGroup').click(function() {
	$('#delete_group_id').val($(this).attr('data-id'))
	$('#delete_group_name').text($(this).attr('data-name'))
})

$('#deleteChatGroupForm').submit(function(e) {
	e.preventDefault();

	let formData = $(this).serialize();

	$.ajax({
		url: '/delete-chat-group',
		type: "POST",
		data: formData,
		success: function(res) {
			alert(res.msg);
			if(res.success) {
				location.reload();
			}
		} 
	});
});

///////////////////// copy sharable link /////////////////////
$('.copy').click(function() {
	$(this).prepend('<span class="copied_text">Copied</span>');

	let group_id = $(this).attr('data-id');
	let url = window.location.host+'/share-group/'+group_id;

	let temp = $('<input>');
	$('body').append(temp);
	temp.val(url).select();
	document.execCommand("copy");

	temp.remove();

	setTimeout(() => {
		$('.copied_text').remove();
	}, 3000);
});

/////////////////////// Join group script ///////////////////
$('.join-now').click(function() {
	$(this).text('Wait....');
	$(this).attr('disabled', 'disabled');
	
	let group_id = $(this).attr('data-id');

	$.ajax({
		url: '/join-group',
		type: 'POST',
		data: { group_id: group_id },
		success: function(res) {
			alert(res.msg);
			if(res.success) {
				location.reload();
			} else {
				$(this).text('Join Now');
				$(this).removeAttr('disabled');
			}
		}
	})
})

/////////////////////// Group Chatting script ///////////////////
function scrollGroupChat() {
	$('#group-chat-container').animate({
		scrollTop: $('#group-chat-container').offset().top + $('#group-chat-container')[0].scrollHeight
	}, 0);
}

$('.group-list').click(function() {
	$('.group-start-head').hide();
	$('.group-chat-section').show();

	global_group_id = $(this).attr('data-id');

	loadGroupChats();
});

$('#group-chat-form').submit(function(event) {
	event.preventDefault();

	let message = $('#group-message').val();

	$.ajax({
		url: '/group-save-chat',
		type: 'POST',
		data: { sender_id: sender_id, group_id: global_group_id, message: message },
		success: function(response) {
			if(response.success) {
				console.log("response", response.chat);
				$('#group-message').val('');
				let message = response.chat.message;
				let html = `
					<div class="current-user-chat" id='`+response.chat._id+`'>
						<h5>
							<span>`+message+`</span>
						</h5>
					</div>
				`;
				$('#group-chat-container').append(html);
				socket.emit('newGroupChat', response.chat);

				scrollChat();
			} else {
				alert(data.message);
			};
		},
	});
});

socket.on('loadNewGroupChat', function(data) {
	if(global_group_id == data.group_id) {
		let html = `
			<div class="distance-user-chat" id='`+data._id+`'>
				<h5>
					<span>`+data.message+`</span>
				</h5>
			</div>
		`;
		$('#group-chat-container').append(html);

		scrollGroupChat(); // scroll chat data
	};
});

function loadGroupChats() {
	$.ajax({
		url: '/load-group-chats',
		type: "POST",
		data: { group_id: global_group_id },
		success: function(res) {
			if(res.success) {
				console.log('chats', res)
				let chats = res.data;
				let html = ``;

				for(let i =0; i < chats.length; i++) {
					let className = 'distance-user-chat'
					if(chats[i]['sender_id'] == sender_id) {
						className = 'current-user-chat'
					}

					html += `
						<div class="`+className+`" id='`+chats[i]['_id']+`'>
							<h5>
								<span>`+chats[i]['message']+`</span>
							</h5>
						</div>
					`;
				}

				$('#group-chat-container').html(html);

				scrollGroupChat();
			} else {
				alert(res.msg)
			}
		}
	})
}