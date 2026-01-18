class SeachController {
    index(req, res){
        res.render('search');
    }

    show(req,res){
        res.send('retail!!!!')
    }
}

module.exports = new SeachController;