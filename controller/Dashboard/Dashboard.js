const moment = require('moment');
const TwitterPosts = require('../../models/TwitterPosts');
const InstagramPosts = require('../../models/InstagramPosts');
const LinkedinPosts = require('../../models/LinkedinPosts');

exports.GetDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const last7Days = moment().subtract(6, 'days').startOf('day');
    const monthStart = moment().startOf('month');

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

    // Get last 7 days posts
    const [weeklyTwitterPosts, weeklyInstagramPosts, weeklyLinkedinPosts] = await Promise.all([
      TwitterPosts.find({
        tobePublishedAt: {
          $gte: last7Days.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      }),
      InstagramPosts.find({
        tobePublishedAt: {
          $gte: last7Days.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      }),
      LinkedinPosts.find({
        tobePublishedAt: {
          $gte: last7Days.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      })
    ]);

    // Get this month's posts
    const [monthlyTwitterPosts, monthlyInstagramPosts, monthlyLinkedinPosts] = await Promise.all([
      TwitterPosts.find({
        tobePublishedAt: {
          $gte: monthStart.toDate(),
          $lte: moment().endOf('month').toDate()
        }
      }),
      InstagramPosts.find({
        tobePublishedAt: {
          $gte: monthStart.toDate(),
          $lte: moment().endOf('month').toDate()
        }
      }),
      LinkedinPosts.find({
        tobePublishedAt: {
          $gte: monthStart.toDate(),
          $lte: moment().endOf('month').toDate()
        }
      })
    ]);

    // Calculate daily stats for last 7 days
    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayStart = moment().subtract(i, 'days').startOf('day');
      const dayEnd = moment().subtract(i, 'days').endOf('day');

      dailyStats[date] = {
        totalPosts: {
          all: weeklyTwitterPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            post.isPublished
          ).length +
          weeklyInstagramPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            post.isPublished
          ).length +
          weeklyLinkedinPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            post.isPublished
          ).length,
          twitter: weeklyTwitterPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            post.isPublished
          ).length,
          instagram: weeklyInstagramPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            post.isPublished
          ).length,
          linkedin: weeklyLinkedinPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            post.isPublished
          ).length
        },
        scheduled: {
          all: weeklyTwitterPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            !post.isPublished
          ).length +
          weeklyInstagramPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            !post.isPublished
          ).length +
          weeklyLinkedinPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            !post.isPublished
          ).length,
          twitter: weeklyTwitterPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            !post.isPublished
          ).length,
          instagram: weeklyInstagramPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            !post.isPublished
          ).length,
          linkedin: weeklyLinkedinPosts.filter(post => 
            moment(post.tobePublishedAt).isBetween(dayStart, dayEnd, null, '[]') && 
            !post.isPublished
          ).length
        }
      };
    }

    const dashboardStats = {
      today: {
        totalPosts: todayTwitterPosts.length + todayInstagramPosts.length + todayLinkedinPosts.length,
        scheduledPosts: todayTwitterPosts.filter(post => post.status === 'scheduled').length +
                       todayInstagramPosts.filter(post => post.status === 'scheduled').length +
                       todayLinkedinPosts.filter(post => post.status === 'scheduled').length,
        platformWise: {
          twitter: todayTwitterPosts.length,
          instagram: todayInstagramPosts.length,
          linkedin: todayLinkedinPosts.length
        }
      },
      last7Days: {
        totalPosts: weeklyTwitterPosts.length + weeklyInstagramPosts.length + weeklyLinkedinPosts.length,
        platformWise: {
          twitter: weeklyTwitterPosts.length,
          instagram: weeklyInstagramPosts.length,
          linkedin: weeklyLinkedinPosts.length
        },
        dailyStats: dailyStats
      },
      thisMonth: {
        totalPosts: monthlyTwitterPosts.length + monthlyInstagramPosts.length + monthlyLinkedinPosts.length,
        platformWise: {
          twitter: monthlyTwitterPosts.length,
          instagram: monthlyInstagramPosts.length,
          linkedin: monthlyLinkedinPosts.length
        }
      },
      allTime: {
        totalPosts: 0, // Placeholder for total posts, needs to be calculated
        platformWise: {
          twitter: 0, // Placeholder for total Twitter posts
          instagram: 0, // Placeholder for total Instagram posts
          linkedin: 0 // Placeholder for total Linkedin posts
        }
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
