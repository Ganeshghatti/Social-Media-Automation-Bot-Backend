const moment = require('moment');
const TwitterPosts = require('../../models/TwitterPosts');
const InstagramPosts = require('../../models/InstagramPosts');
const LinkedinPosts = require('../../models/LinkedinPosts');

exports.GetDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const weekStart = moment().startOf('week');
    const weekEnd = moment().endOf('week');

    // Get today's posts
    const [todayTwitterPosts, todayInstagramPosts, todayLinkedinPosts] = await Promise.all([
      TwitterPosts.find({
        tobePublishedAt: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      }),
      InstagramPosts.find({
        tobePublishedAt: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      }),
      LinkedinPosts.find({
        tobePublishedAt: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      })
    ]);

    // Get this week's posts
    const [weeklyTwitterPosts, weeklyInstagramPosts, weeklyLinkedinPosts] = await Promise.all([
      TwitterPosts.find({
        tobePublishedAt: {
          $gte: weekStart.toDate(),
          $lte: weekEnd.toDate()
        }
      }),
      InstagramPosts.find({
        tobePublishedAt: {
          $gte: weekStart.toDate(),
          $lte: weekEnd.toDate()
        }
      }),
      LinkedinPosts.find({
        tobePublishedAt: {
          $gte: weekStart.toDate(),
          $lte: weekEnd.toDate()
        }
      })
    ]);

    // Get scheduled posts for today
    const [scheduledTwitterPosts, scheduledInstagramPosts, scheduledLinkedinPosts] = await Promise.all([
      TwitterPosts.find({
        tobePublishedAt: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        },
        isPublished: false
      }).select('text tobePublishedAt status'),
      InstagramPosts.find({
        tobePublishedAt: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        },
        isPublished: false
      }).select('text tobePublishedAt status'),
      LinkedinPosts.find({
        tobePublishedAt: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        },
        isPublished: false
      }).select('text tobePublishedAt status')
    ]);

    // Get total posts count
    const [totalTwitterPosts, totalInstagramPosts, totalLinkedinPosts] = await Promise.all([
      TwitterPosts.countDocuments(),
      InstagramPosts.countDocuments(),
      LinkedinPosts.countDocuments()
    ]);

    // Get published vs scheduled stats for this week
    const weeklyStats = {
      twitter: {
        published: weeklyTwitterPosts.filter(post => post.isPublished).length,
        scheduled: weeklyTwitterPosts.filter(post => !post.isPublished).length
      },
      instagram: {
        published: weeklyInstagramPosts.filter(post => post.isPublished).length,
        scheduled: weeklyInstagramPosts.filter(post => !post.isPublished).length
      },
      linkedin: {
        published: weeklyLinkedinPosts.filter(post => post.isPublished).length,
        scheduled: weeklyLinkedinPosts.filter(post => !post.isPublished).length
      }
    };

    const dashboardStats = {
      today: {
        totalPosts: todayTwitterPosts.length + todayInstagramPosts.length + todayLinkedinPosts.length,
        scheduledPosts: scheduledTwitterPosts.length + scheduledInstagramPosts.length + scheduledLinkedinPosts.length,
        platformWise: {
          twitter: todayTwitterPosts.length,
          instagram: todayInstagramPosts.length,
          linkedin: todayLinkedinPosts.length
        }
      },
      thisWeek: {
        totalPosts: weeklyTwitterPosts.length + weeklyInstagramPosts.length + weeklyLinkedinPosts.length,
        stats: weeklyStats
      },
      allTime: {
        totalPosts: totalTwitterPosts + totalInstagramPosts + totalLinkedinPosts,
        platformWise: {
          twitter: totalTwitterPosts,
          instagram: totalInstagramPosts,
          linkedin: totalLinkedinPosts
        }
      },
      scheduledToday: {
        twitter: scheduledTwitterPosts,
        instagram: scheduledInstagramPosts,
        linkedin: scheduledLinkedinPosts
      }
    };

    res.status(200).json({
      success: true,
      data: dashboardStats
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard statistics"
    });
  }
};
