class StatisticController {
    async index(req, res) {
        res.redirect('/employee/statistics');
    }
        

    search(req,res){
        res.render('search');
    }
}

module.exports = new StatisticController;
