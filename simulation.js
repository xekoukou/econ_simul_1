
var simulation = new Simulation(
    [
        ["time" , "total_production" , "test_id", 1800, 800],
        ["time" , "total_sales" , "test_id2", 1800, 800],
        ["time" , "average_price" , "test_id3", 1800, 800],
        ["time" , "employment" , "test_id4", 1800, 800],
        ["time" , "average_wage" , "test_id5", 1800, 800],
        ["time" , "total_lent_money" , "test_id6", 1800, 800],
        ["time" , "average_loan_rate" , "test_id7", 1800, 800],
        ["time" , "companies" , "test_id8", 1800, 800],
        ["time" , "average_profit" , "test_id9", 1800, 800]
//        ["time" , "total_money" , "test_id3", 900, 400]
    ], [
        ["profit" , "companies" , "profit_distr", 1800, 800],
        ["money" , "agents" , "money_distr", 1800, 800]
    ] , 10 , 1);
