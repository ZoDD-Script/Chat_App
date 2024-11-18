const User = require('../models/userModel');
const Chat = require('../models/chatModel');
const Group = require('../models/groupModel');
const Member = require('../models/memberModel');
const GroupChat = require('../models/groupChatModel');
const bcrypt = require('bcrypt');
const mongoose = require("mongoose");

const registerLoad = async (req, res) => {
  try {
    res.render('register')
  } catch (error) {
    console.log(error.message)
  }
}

const register = async (req, res) => {
  try {
    console.log("file", req.file)
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      image:  'images/'+req.file.filename,
      password:  passwordHash,
    });

    await user.save();

    res.render('register', { message: 'Your Registration have been completed!' })
  
  } catch (error) {
    console.log(error.message)
  }
};

const loadLogin = async (req, res) => {
  try {
    res.render('login');
  } catch (error) {
    console.log(error.message)
  }
}

const login = async (req, res) => {
  try {
    const email = req.body.email
    const password = req.body.password

    const userData = await User.findOne({ email: email })

    if(userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if(passwordMatch) {
        req.session.user = userData;
        res.cookie(`user`, JSON.stringify(userData));
        res.redirect('/dashboard');
      } else {
        res.render('login', { message: 'Password is Incorrect!' })
      }
    } else {
      res.render('login', { message: 'Email is Incorrect!' });
    }

  } catch (error) {
    console.log(error.message)
  }
}

const logout = async (req, res) => {
  try {
    res.clearCookie('user');
    req.session.destroy();
    res.redirect('/');
  } catch (error) {
    console.log(error.message)
  }
}

const loadDashboard = async (req, res) => {
  try {
    const baseUrl = req.protocol + '://' + req.get('host');
    let users = await User.find({ _id: { $nin: [req.session.user._id] } })
    res.render('dashboard', { user: req.session.user, users: users, baseUrl: baseUrl });
  } catch (error) {
    console.log(error.message)
  }
}

const saveChat = async (req, res) => {
  try {
    const chat = new Chat({
      sender_id: req.body.sender_id,
      receiver_id: req.body.receiver_id,
      message: req.body.message
    });

    let newChat = await chat.save();
    res.status(200).send({ success: true, msg: 'Chat inserted!', data: newChat });
    
  } catch (error) {
    console.log("error", error)
    res.status(400).send({ success: false, msg: error.message })
  }
}

const deleteChat = async (req, res) => {
  try{
    await Chat.deleteOne({ _id: req.body.id })

    res.status(200).send({ success: true, msg: 'chat deleted' })
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message })
  }
}

const updateChat = async (req, res) => {
  try{
    await Chat.findByIdAndUpdate({ _id: req.body.id }, {
      $set: {
        message: req.body.message
      }
    })

    res.status(200).send({ success: true, msg: 'chat updated' })
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message })
  }
}

const loadGroups = async (req, res) => {
  try{
    const groups = await Group.find({
      creator_id: req.session.user._id,
    });
    
    res.render('group', { groups: groups });

  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const createGroup = async (req, res) => {
  try{
    const group = new Group({
      creator_id: req.session.user._id,
      name: req.body.name,
      image: 'images/'+req.file.filename,
      limit: req.body.limit
    });

    await group.save();

    const groups = await Group.find({
      creator_id: req.session.user._id,
    });

    res.render('group', { message: req.body.name+' Group created successfully', groups: groups });

  } catch (error) {
    console.log('error', error);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const getMembers = async (req, res) => {
  try{
    const users = await User.aggregate([
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "user_id",
          pipeline:[
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [ "$group_id", new mongoose.Types.ObjectId(req.body.group_id) ] }
                  ]
                }
              }
            }
          ],
          as: "member"
        }
      },
      {
        $match: {
          _id: { 
            $nin: [ new mongoose.Types.ObjectId(req.session.user._id) ]
          } 
        }
      }
    ]);
    // console.log('Users', users)
    res.status(200).send({ success: true, data: users });

  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const addMembers = async (req, res) => {
  try{
    if(!req.body.members) {
      res.status(200).send({ success: false, msg: "Please select any one member" });
    } else if (req.body.members.length >  parseInt(req.body.limit)) {
      res.status(200).send({ success: false, msg: "You cannot sellect more than " + req.body.limit + " Members" });
    } else {
      await Member.deleteMany({ group_id: req.body.group_id, });

      let data = [];

      const members = req.body.members;

      for (let i = 0; i < members.length; i++) {
        data.push({
          group_id: req.body.group_id,
          user_id: members[i]
        })
      };

      await Member.insertMany(data);

      res.status(200).send({ success: true, msg: "Members added Successfully" });
    }
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const updateChatGroup = async (req, res) => {
  try{
    if(parseInt(req.body.limit) < parseInt(req.body.last_limit)) {
      await Member.deleteMany({ group_id: req.body.id })
    };

    let updateObj;

    if(req.file != undefined) {
      updateObj = {
        name: req.body.name,
        image: 'images/'+req.file.filename,
        limit: req.body.limit
      };
    } else {
      updateObj = {
        name: req.body.name,
        limit: req.body.limit
      };
    };

    await Group.findByIdAndUpdate({ _id: req.body.id }, {
      $set: updateObj
    });

    res.status(200).send({ success: true, msg: "Chat Group Updated Successfully" });
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const deleteChatGroup = async (req, res) => {
  try{
    await Group.deleteOne({ _id: req.body.id });
    await Member.deleteMany({ group_id: req.body.id });

    res.status(200).send({ success: true, msg: "Chat Group deleted Successfully" });
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const shareGroup = async (req, res) => {
  try{
    const groupData = await Group.findOne({ _id: req.params.id });

    if(!groupData) {
      res.render('error', { message: '404 not found!' });
    } else if(req.session.user == undefined) {
      res.render('error', { message: 'You need to log in to access the Group URL link!' });
    } else {
      let totalMembers = await Member.find({ group_id: req.params.id }).countDocuments();
      let available = groupData.limit - totalMembers;

      let isOwner = groupData.creator_id == req.session.user._id ? true : false;
      let isJoined = await Member.find({ group_id: req.params.id, user_id: req.session.user._id }).countDocuments();

      res.render('shareLink', { group: groupData, available, totalMembers, isOwner, isJoined });
    };
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const joinGroup = async (req, res) => {
  try{
    const member = new Member({
      group_id: req.body.group_id,
      user_id: req.session.user._id,
    });
    
    await member.save();

    res.status(200).send({ success: true, msg: "Congratulation, you have joined the Group Successfully!" });
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const groupChats = async (req, res) => {
  try {
    const myGroups = await Group.find({ creator_id: req.session.user._id });
    const joinedGroups = await Member.find({ user_id: req.session.user._id }).populate('group_id');

    res.render('chat-group', { myGroups, joinedGroups })
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message });
  }
}

const saveGroupChats = async (req, res) => {
  try {
    const chat = new GroupChat({
      sender_id: req.body.sender_id,
      group_id: req.body.group_id,
      message: req.body.message,
    });

    const newChat = await chat.save();

    const cChat = await GroupChat.findOne({ _id: newChat._id }).populate('sender_id');

    res.status(200).send({ success: true, chat: cChat });
  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message });
  }
}

const loadGroupChats = async (req, res) => {
  try{
    const groupChats = await GroupChat.find({ group_id: req.body.group_id }).populate('sender_id');
    
    res.status(200).send({ success: true, data: groupChats });

  } catch (error) {
    console.log('error', error.message);
    res.status(400).send({ success: false, msg: error.message })
  }
}

const deleteGroupChatMessage = async (req, res) => {
  try{
    await GroupChat.deleteOne({ _id: req.body.id })

    res.status(200).send({ success: true, msg: 'Group chat message deleted' })
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message })
  }
}

const updateGroupChatMessage = async (req, res) => {
  try{
    await GroupChat.findByIdAndUpdate({ _id: req.body.id }, {
      $set: {
        message: req.body.message
      }
    })

    res.status(200).send({ success: true, msg: 'chat updated' })
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message })
  }
}

module.exports = {
  registerLoad,
  register,
  loadLogin,
  login,
  logout,
  loadDashboard,
  saveChat,
  deleteChat,
  updateChat,
  loadGroups,
  createGroup,
  getMembers,
  addMembers,
  updateChatGroup,
  deleteChatGroup,
  shareGroup,
  joinGroup,
  groupChats,
  saveGroupChats,
  loadGroupChats,
  deleteGroupChatMessage,
  updateGroupChatMessage
}