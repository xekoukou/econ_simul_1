function Point(x , y){
    this.x = x;
    this.y = y;
}

function Company_info(agent_id , company_id) {
    this.agent_id = agent_id;
    this.company_id = company_id;
}

function assert(b , msg) {
    if(!b) {
	throw msg || "Assertion Failed"
    }
}
function rand(width) {
    return Math.floor(Math.random() * width);
}


function rand_exp(unit) {
    var i = Math.random();
    return Math.floor((0 - Math.log(1 - i)) * unit);
}


function rand_except(width , id) {
    var nid;
    do {
	nid = Math.floor(Math.random() * width);
    } while (nid == id)
    return nid;
}

function rand_key(val) {
    var keys = Object.keys(val);
    var id = rand(keys.length);
    return parseInt(keys[id]);
}

function different_from_all_cmp(val , list){
    var ret = true;
    list.forEach(function(e) {
	if((e.agent_id == val.agent_id) && (e.company_id == val.company_id)){
	    ret = false;
	}
    });
    return ret;
}


function different_from_all(val , list){
    var ret = true;
    list.forEach(function(e) {
	if(e == val){
	    ret = false;
	}
    });
    return ret;
}

//TODO This needs at least 2 items.
function rand_except_list(width , list) {
    var nid;
    do {
	nid = Math.floor(Math.random() * width);
    } while (!different_from_all(nid, list))
    return nid;
}


function Opportunity(j , o) {
    this.jobs = rand(j) + 1;
    this.output = rand(o) + 1;
}

function fixed_op(j , o) {
    var op = new Opportunity(1 , 1);
    op.jobs = j;
    op.output = o;
    return op;
}

function Dept(id , amount , loan_rate) {
    this.id = id;
    this.amount = amount;
    this.loan_rate = loan_rate;
}

var cuid = 0;

function Company(){
    this.prev_prod_profit = 0;
    this.step = 0;
    this.prev_price_higher = -1;
    this.op_id = 0;
    this.id = cuid;
    cuid++;
    this.changed_op = 0;
    this.provided_wage = 2;
    this.product_price = 2;
    this.production = 0;
    this.jobs_filled = 0;
    this.workers = [];
    this.units_sold = 0;
    this.funded = 0;
}


function Agent(id , money , nl , na) {
    // the amount of memory
    this.nl = nl;
    this.id = id;
    // the amount of money
    this.money = money;
    // For paying workers.
    this.reserved = 0;
    // It should have at least one company.
    var cmp = new Company();
    this.companies = {};
    this.companies[cmp.id] = cmp;
    this.average_product_price = 0;
    this.average_wage = 0;
    this.debts = [];
    // The amount of money he has lent to others.
    // This is to be set to zero every turn before new lending happens because we use it to
    // find the loan profitability with the current loan_rate.
    this.lent_money = 0;
    this.loans = [];
    this.prev_loan_rate_higher = -1;
    this.prev_loan_profit = 0;
    this.lstep = 0;
    // Ids of the agents that own the company.
    this.known_products = [];
    this.known_workplaces = [];
    this.known_loan_rates = [];

    // The order here is important for op_id.
    this.opportunities = [] ;
    this.opportunities.push(fixed_op(1 , 2));
    this.loan_rate = 1;
}

function company_has_filled_job_positions(agent , company) {
    var op = agent.opportunities[company.op_id];
    if(company.funded == 1 && company.jobs_filled == op.jobs){
	return true;
    }
    return false;
}

function agent_has_filled_job_positions(agent) {
    var keys = Object.keys(agent.companies);
    while(keys.length > 0){
	id = keys.pop();
	var company = agent.companies[id];
	if(company_has_filled_job_positions(agent, company)){
	    return true;
	}
    }
    return false;
}

function agent_unfunded_companies(agent) {
    var list = [];
    var keys = Object.keys(agent.companies);
    while(keys.length > 0){
	id = keys.pop();
	var company = agent.companies[id];
	if(company.funded == 0){
	    list.push(id);
	}
    }
    return list;
}


function company_the_profit(agent , company) {
    var op = agent.opportunities[company.op_id];
    return op.output * company.product_price - op.jobs * company.provided_wage;  
}

function company_profit(agent , company) {
    if(company_has_filled_job_positions(agent, company)) {
	return company.units_sold * company.product_price - company.jobs_filled * company.provided_wage;
    } else {
	return 0;
    }
}


function agent_adapt_prices(agent) {
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	company_adapt_prices(agent , company);
    });
}

function company_adapt_prices(agent , company) {
    var op = agent.opportunities[company.op_id];
    var th_profit = company_the_profit(agent , company);
    assert(th_profit > 0 , "we changed the prices to have a negative theoretical profit.");


    if(company.funded == 0) {
	company.prev_prod_profit = 0;
	company.step = 0;
	company.prev_price_higher = -1;
	if(company.provided_wage > 1 && rand(10) == 0) {
	    company.provided_wage--;
	    //Since unfunded, you have no personal knowledge about the product price,
	    //thus update it by external information till you are producing again.
	    while(company.product_price > agent.average_product_price){
		company.product_price--;
		if(company_the_profit(agent , company) <=0) {
		    company.product_price++;
		    break;
		}
	    }
	}
    }

    if(company.funded == 1) {
	
	if((company.jobs_filled < op.jobs)) {
	    company.prev_prod_profit = 0;
	    company.step = 0;
	    company.prev_price_higher = -1;
	    if(rand(10) == 0) {
		// If there is a theoretical profit , but not enough workers , increase wage.
		if(th_profit - op.jobs > 0) {
		    company.provided_wage++;
		} else {
		    company.provided_wage++;
		    company.product_price += Math.floor ((op.jobs / op.output) + 1) ;
		}
	    }
	}
	
	if(company.jobs_filled == op.jobs) {
	    var	re_profit = company_profit(agent , company);

	    // profit cannot be used to determine the price changes , thus we pick randomly.
	    // The randomization here is necessary so that the agent manages to perceive that
	    // it is not his action that changed production, but the macroscopic conditions.
	    // Consider the case where the agent reduces the price and the overall sales
	    // of the economy increase. If the agent sees increased profits, what would be the reason?
	    if(company.prev_price_higher == -1 || company.changed_op == 1 || rand(100) == 0){
		company.prev_prod_profit = 0;
		company.step = 0;
		if(rand(2) == 0 && company.product_price > 1 && th_profit - op.output > 0){
		    company.product_price--;
		    company.prev_price_higher = 1;
		} else {
		    company.product_price++;
		    company.prev_price_higher = 0;
		}
	    } else {
		assert(company.step != 0 , "Error");
		if (re_profit > (company.prev_prod_profit / company.step) && rand(10) == 0) {
		    company.prev_prod_profit = 0;
		    company.step = 0;
		    
		    if (company.prev_price_higher == 1) {
			if(company.product_price > 1 && th_profit - op.output > 0){
			    company.product_price--;
			} else {
			    company.prev_price_higher = -1;
			}
		    } else {
			company.product_price++;
		    }
		}
		if (re_profit <= (company.prev_prod_profit / company.step) && rand(10) == 0) {
		    company.prev_prod_profit = 0;
		    company.step = 0;
		    if (company.prev_price_higher == 1) {
			company.product_price++;
			company.prev_price_higher = 0;
		    } else {
			if(company.product_price > 1 && th_profit - op.output > 0){
			    company.product_price--;
			    company.prev_price_higher = 1;
			} else {
			    company.prev_price_higher = -1;
			}
		    }
		}
		// We randomly try to change wages. That should not result
		// in the company being closed all the time due to lack of workers.
		if(rand(100) == 0) {
		    // Reduce the wage
		    if(company.provided_wage > 1) {
			company.provided_wage--;
			company.prev_price_higher = -1;
		    }
		}
	    }
	    // Update the previous profit variable.
	    company.prev_prod_profit += re_profit;
	    company.step++;
	}
    }
}

//The agent does not loan money he needs to invest in his companies.
function agent_min_money(agent) {
    var min_money = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	var op = agent.opportunities[company.op_id];
	min_money += op.jobs * company.provided_wage;
    });
    
    return min_money;
}

function agent_adapt_loan_rate(agent) {

    // Interest rate policy
    var loan_profit = agent.lent_money * agent.loan_rate / 100;

    // For the rand see, adapt_prices.
    if(agent.prev_loan_rate_higher == -1 || rand(100) == 0){
	agent.lstep = 0;
	agent.prev_loan_profit = 0;
	if(rand(2) == 0 && agent.loan_rate > 1){
	    agent.loan_rate--;
	    agent.prev_loan_rate_higher = 1;
	} else {
	    agent.loan_rate++;
	    agent.prev_loan_rate_higher = 0;
	}
    } else {
	if(rand(10) == 0) {
		assert(agent.lstep != 0 , "Error");
	    if((agent.prev_loan_profit / agent.lstep) < loan_profit) {
		agent.lstep = 0;
		agent.prev_loan_profit = 0;
		if(agent.prev_loan_rate_higher == 1) {
		    if(agent.loan_rate > 1){
			agent.loan_rate--;
		    } else {
			agent.prev_loan_rate_higher = -1;
		    }
		} else {
		    agent.loan_rate++;
		}
	    } else {
		agent.lstep = 0;
		agent.prev_loan_profit = 0;
		if(agent.prev_loan_rate_higher == 1) {
		    agent.loan_rate++;
		    agent.prev_loan_rate_higher = 0;
		} else {
		    if(agent.loan_rate > 1){
		    agent.loan_rate--;
			agent.prev_loan_rate_higher = 1;
		    } else {
			agent.prev_loan_rate_higher = -1;
		    }
		}
	    }
	}
    }
    agent.prev_loan_profit += loan_profit;
    agent.lstep++;
    
}


function agent_learn_opportunity(agent , agents , par) {
    if(par.op_chance == -1){
	return;
    }

    if(rand(par.op_chance) == 0) {
	var nop = new Opportunity(par.jobs_width , par.output_width);
	agent.opportunities.push(nop);
    }
}


function agent_learn_workplaces(agent , agents , par) {
    var wage = 0;
    var times = 0;
    agent.known_workplaces = [];
    for(var j = 0; j < agent.nl; j++) {
	var nid = -1;
	var cid = -1;
	var cmp_info;
	var nag;
	var q = 1000;
	do {
	    q--;
	    if(q < 0) {
		break;
	    }
	    nid = rand_except(par.na , agent.id);
	    nag = agents[nid];
	    cid = rand_key(nag.companies);
	    cmp_info = new Company_info(nid , cid);
	} while (nag.companies[cid].funded == 0 || !different_from_all_cmp(cmp_info , agent.known_workplaces))

	if(nid != -1 && nag.companies[cid].funded == 1 && different_from_all_cmp(cmp_info , agent.known_workplaces)) {
	    wage += nag.companies[cid].provided_wage;
	    times++;
	    agent.known_workplaces.push(cmp_info);
	}
    }
    if(times == 0) {
	agent.average_wage = 0;
    } else {
	agent.average_wage = wage / times;
    }
}


function agent_learn_products(agent , agents , par) {
    var price = 0;
    var times = 0;
    agent.known_products = [];
    for(var j = 0; j < agent.nl; j++) {
	var nid = -1;
	var cid = -1;
	var cmp_info;
	var  nagp;
	var q = 1000;
	do {
	    q--;
	    if(q < 0) {
		    break;
	    }
	    nid = rand_except(par.na , agent.id);
	    nagp = agents[nid];
	    cid = rand_key(nagp.companies);
	    cmp_info = new Company_info(nid , cid);
	} while (!company_has_filled_job_positions(nagp , nagp.companies[cid]) || !different_from_all_cmp(cmp_info , agent.known_products))
	if(nid != -1 && company_has_filled_job_positions(nagp , nagp.companies[cid]) && different_from_all_cmp(cmp_info , agent.known_products)) {
	    price += nagp.companies[cid].product_price;
	    times++;
	    agent.known_products.push(cmp_info);
	}
    }
    if(times == 0) {
	agent.average_product_price = 0;
    } else {
	agent.average_product_price = price / times;
    }
}


function agent_learn_loan_rates(agent , agents , par) {
    agent.known_loan_rates = [];
    for(var j = 0; j < agent.nl; j++) {
	var nr = -1;
	    var nagr;
	var nmin_money;
	var q = 1000;
	do {
	    q--;
	    if(q < 0) {
		break;
	    }
	    nr = rand_except(par.na , agent.id);
	    nagr = agents[nr];

	    // The min_money is not known to the agent. The lenter informs him that he cannot lent.
	    nmin_money = agent_min_money(nagr);
	} while (nagr.money < nmin_money || !different_from_all(nr , agent.known_loan_rates))
	if(nr != -1 && nagr.money > agent_min_money(nagr) && different_from_all(nr , agent.known_loan_rates)) {
	    agent.known_loan_rates.push(nr);
	}
    }
}



function agent_find_cheapest (agent , agents) {
    var list_with_available_products = [];
    for (var i = 0; i < agent.known_products.length ; i++) {
	var cmp_info = agent.known_products[i];
        var seller = agents[cmp_info.agent_id];
	var seller_cmp = seller.companies[cmp_info.company_id];
	var navailable = seller_cmp.production - seller_cmp.units_sold;

	if (navailable > 0) {
	    list_with_available_products.push(cmp_info);
	}
    }


    if(list_with_available_products.length > 0) {
	var cmp_info = list_with_available_products[0];
        var seller = agents[cmp_info.agent_id];
	var seller_cmp = seller.companies[cmp_info.company_id];
	var price = seller_cmp.product_price;
	
	for (var i = 0; i < list_with_available_products.length ; i++) {
	    var ncmp_info = list_with_available_products[i];
            var nseller = agents[ncmp_info.agent_id];
	    var nseller_cmp = nseller.companies[ncmp_info.company_id];
	    var nprice = nseller_cmp.product_price;
	    if (nprice <= price) {
		cmp_info = ncmp_info;
		price = nprice;
	    }
	}
	return cmp_info;
    } else {
	return -1;
    }
}

function agent_consume(agent , agents , par) {
    //Do not consume Debt.
    var debt = 0;
    agent.debts.forEach(function(debt){
	debt += debt.amount;
    });

    var money = Math.min(agent.money - debt , rand_exp((agent.money - debt) * par.cons_exp));

    while(money > 0) {
	var cmp_info = agent_find_cheapest(agent , agents);
	if (cmp_info == -1) {
	    return;
	} else {
	    var seller = agents[cmp_info.agent_id];
	    var seller_cmp = seller.companies[cmp_info.company_id];
	    if(money < seller_cmp.product_price) {
		return;
	    } else {
		agent.money = agent.money - seller_cmp.product_price;
		money = money - seller_cmp.product_price;
		assert(agent.money >= 0 , "Consumer money should be non negative.");
		seller.money = seller.money + seller_cmp.product_price;
		seller_cmp.units_sold++;
		assert(seller_cmp.production - seller_cmp.units_sold >= 0 , "Units sold should fewer than production.");
	    }
	}
    }
}


// This is based on the current perception of wages and product prices of the agent.
// Thus the best option depends on the market.
function company_find_best_opportunity(agent , company , rejected) {
    var price = company.product_price;
    var wage = company.provided_wage;
    var op =  agent.opportunities[company.op_id];
    var id = company.op_id;
    var the_profit = op.output * price - op.jobs * wage;
    for (var i = 0; i < agent.opportunities.length; i++) {
	var nop = agent.opportunities[i];
	var nprofit = nop.output * price - nop.jobs * wage;
	if ((nprofit >= the_profit) && (-1 == rejected.indexOf(i))) {
	    op = nop;
	    the_profit = nprofit;
	    id = i;
	}
    }
    return id;
}


function agent_find_lower_rate (agent , money_needed , agents) {
    var list_who_has_money = [];

    for (var i = 0; i < agent.known_loan_rates.length ; i++) {
	var nid = agent.known_loan_rates[i];
	var min_money = agent_min_money(agents[nid]);
	if (agents[nid].money - min_money - money_needed > 0) {
	    list_who_has_money.push(nid);
	}
    }

    if(list_who_has_money.length > 0) {
	var id = list_who_has_money[0];
	var rate = agents[id].loan_rate;
	for (var i = 0; i < list_who_has_money.length ; i++) {
	    var nid = list_who_has_money[i];
	    var nrate = agents[nid].loan_rate;
	    if (nrate < rate) {
		id = nid;
		rate = nrate;
	    }
	}
	return id;
    } else {
	return -1;
    }
}


function agent_fund_companies(agent , agents) {
    Object.keys(agent.companies).forEach(function(id){
	agent_fund_company(agent , agent.companies[id] , agents);
    });
}

// Here I assume that the lenders give money to everyone that is asking,
// and that the borrower will pay eveentually all his debt, no defaults are possible.
// This is to simplify the model.
// TODO Should we reduce the frequency with which companies change production processes ?
function agent_fund_company(agent , company , agents) {
    if(agent.debts.length > 0 || company.prev_prod_profit < 0) {
	return;
    }
    var company_op_id = company.op_id;

    var rejected = [];
    var op_id;
    if(rand(1000) == 0) {
	op_id = company_find_best_opportunity(agent , company , rejected);
    } else {
	op_id = company.op_id;
    }
    do {
	var op = agent.opportunities[op_id];
	var req = op.jobs * company.provided_wage;
	if(agent.money - agent.reserved >= req) {
	    agent.reserved += req;
	    company.op_id = op_id;
	    company.funded = 1;
	    if(op_id != company_op_id){
		company.changed_op = 1;
	    }
	}
	rejected.push(op_id);
	op_id = company_find_best_opportunity(agent , company , rejected);
    } while ((company.funded == 0) && (rejected.length < agent.opportunities.length)) ;
}

function agent_fund_companies_with_loan(agent , agents) {
    Object.keys(agent.companies).forEach(function(id){
	agent_fund_company_with_loan(agent , agent.companies[id] , agents);
    });
}

function agent_fund_company_with_loan(agent , company , agents) {
    if(company.funded == 1 || agent.debts.length > 0 || company.prev_prod_profit < 0) {
	return;
    }

    var company_op_id = company.op_id;
    var rejected = [];
    var op_id;
    if(rand(1000) == 0) {
	op_id = company_find_best_opportunity(agent , company , rejected);
    } else {
	op_id = company.op_id;
    }
    do {
	var op = agent.opportunities[op_id];
	var req = op.jobs * company.provided_wage;
	assert(agent.reserved >= 0 , "Reserved money should be positive.");
	assert(agent.money - agent.reserved < req , "The agent should not have any money at this point.");
	assert(agent.money - agent.reserved >= 0 , "One should not reserve more money than it has.");
	var rem = req - (agent.money - agent.reserved) ;
	var lid = agent_find_lower_rate (agent , rem , agents);
	if(lid != -1) {
	    var lender = agents[lid];
	    var loan = Math.floor((lender.loan_rate + 100) * rem / 100);
	    if(company_the_profit(agent , company) - loan > 0) {
		company.op_id = op_id;
		company.funded = 1;
		agent.money = agent.money + rem;
		agent.reserved = agent.money;
		agent.debts.push(new Dept(lid , rem , lender.loan_rate));
		lender.money = lender.money - rem;
		assert(lender.money >= 0 , "Lender money non negative");
		lender.lent_money = lender.lent_money + rem;
		assert(lender.money >= agent_min_money(lender) , "Lender gave more money that he could.")
		if(op_id != company_op_id){
		    company.changed_op = 1;
		}
	    }
	}
	rejected.push(op_id);
	op_id = company_find_best_opportunity(agent , company , rejected);
    } while ((company.funded == 0) && (rejected.length < agent.opportunities.length)) ;
}


// This should be done after consumption.
//agent.lent_money is set to zero in every cycle.
// lent_money is used to track new loans.
function agent_pay_debt(agent, agents) {
    while ((agent.debts.length > 0) && (agent.money > 0)) {
	var debt = agent.debts.pop();
	var lender = agents[debt.id];
        var loan = Math.floor ((debt.loan_rate + 100) * debt.amount / 100)
	if (agent.money >= loan){
	    agent.money = agent.money - loan;
	    assert(agent.money >= 0 , "Borrower money non negative");
	    lender.money = lender.money + loan;
	} else {
	    var repaid = agent.money;
	    agent.money = 0;
	    lender.money = lender.money + repaid;
	    debt.amount = Math.floor (debt.amount - (repaid * 100 / (100 + debt.loan_rate)));
	    agent.debts.push(debt);
	}
    }
}

function find_remaining_workers(agents) {
    var ids = fill_with_ids(agents.length);
    while(ids.length > 0) {
	var id = pick_rand_id(ids);
	var agent = agents[id];
	var keys = Object.keys(agent.companies);
	for(var j = 0 ; j < keys.length; j++) {
	    var company = agent.companies[keys[j]];
	    if(company.funded == 1 && !company_has_filled_job_positions(agent , company) && company.jobs_filled != 0){
		company.jobs_filled = 0;
		var workers = company.workers;
		company.workers = [];
		return { "cmp_info" : new Company_info(agent.id , company.id) ,
		         "workers"  : workers
		       }
	    }
	}
    }
    return -1;
}

function relocate_workers(agents , par) {
    var rejected = [];
    var result = find_remaining_workers(agents);
    while(result != -1){
	rejected.push(result.cmp_info);
	result.workers.forEach(function(id){
	    var agent = agents[id];
	    agent_pick_workplace_(agent, agents, par , rejected);
	});
	result = find_remaining_workers(agents);
    }
}

function agent_pick_workplace(agent , agents , par) {
    agent_pick_workplace_(agent , agents , par , []);
}

function agent_pick_workplace_(agent , agents , par , rejected) {
    var list_with_available_jobs = [];
    for (var i = 0; i < agent.known_workplaces.length ; i++) {
	var ncmp_info = agent.known_workplaces[i];
	var employer = agents[ncmp_info.agent_id];
	var company = employer.companies[ncmp_info.company_id];
	var available_jobs = employer.opportunities[company.op_id].jobs - company.jobs_filled;
	if ((company.funded == 1) && (available_jobs > 0) && different_from_all_cmp(ncmp_info , rejected)) {
	    list_with_available_jobs.push(ncmp_info);
	}
    }

    if(list_with_available_jobs.length > 0) {
	var cmp_info = list_with_available_jobs[0];
	var wage = agents[cmp_info.agent_id].companies[cmp_info.company_id].provided_wage;
	for (var i = 0; i < list_with_available_jobs.length ; i++) {
	    var ncmp_info = list_with_available_jobs[i];
	    var employer = agents[ncmp_info.agent_id];
	    var company = employer.companies[ncmp_info.company_id];
	    var nwage = company.provided_wage;
	    if (nwage > wage) {
		cmp_info = ncmp_info;
		wage = nwage;
	    }
	}
	
	var employer = agents[cmp_info.agent_id];
	var company = employer.companies[cmp_info.company_id];
	var min_wage = par.min_consumption * agent.average_product_price;

	if(company.provided_wage > min_wage){
	    company.jobs_filled++;
	    company.workers.push(agent.id);
	}
    }
}


function company_pay_workers(agent , company , agents) {
    assert(company.jobs_filled == company.workers.length , "The number of jobs filled is not equal to the number of workers employed");
    while(company.workers.length > 0) {
	assert(company.funded == 1 , "To have workers, you must be funded.");
	var worker = agents[company.workers.pop()];
	worker.money = worker.money + company.provided_wage;
	agent.money = agent.money - company.provided_wage;
	assert(agent.money >= 0 , "Employer money should be non negative");
    }
}


function agent_produce(agent , agents) {
    Object.keys(agent.companies).forEach(function(id){
	company_produce(agent , agent.companies[id] , agents);
    });
}

function company_produce(agent , company , agents) {
    var op = agent.opportunities[company.op_id];
    if((company.funded == 1) && (company.jobs_filled == op.jobs)) {
	company.production = op.output;
	company_pay_workers(agent , company , agents);
    }
}


    // Accurate information of prices and wages is important for many operations.
    // If the agent cannot have direct contact with the market, it checks the average price.
//    if(agent.company_funded == 0) {
//	agent.provided_wage = Math.floor (agent.average_wage);
//	agent.product_price = Math.floor (agent.average_product_price + 1);
//	var th_profit = agent_the_profit(agent);
//	// TODO Is this the correct way to do it?
//	if(th_profit <= 0) {
//	    agent.provided_wage += th_profit - 1;
//	    if(agent.provided_wage <= 0) {
//		agent.product_price -= (agent.provided_wage - 1);
//		agent.provided_wage = 1;
//	    }
//	}
//	assert(agent_the_profit(agent) > 0 , "GGG");
//  }


function company_after_adapt(agent , company , agents) {
    company.funded = 0;
    company.changed_op = 0;
    company.units_sold = 0;
    company.production = 0;
    company.jobs_filled = 0;
    company.workers = [];
}

// This needs to be done after adaptation and after production, cosmuption.
function agent_after_adapt(agent , agents) {
    Object.keys(agent.companies).forEach(function(id){
	company_after_adapt(agent , agent.companies[id] , agents);
    });
    agent.lent_money = 0;
    agent.reserved = 0;
}


function agent_total_units_sold(agent) {
    var units_sold = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	units_sold += company.units_sold;
    });
    return units_sold;
}

function agent_total_jobs_filled(agent) {
    var jobs_filled = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	if(company_has_filled_job_positions(agent , company)){
	    jobs_filled += company.jobs_filled;
	}
    });
    return jobs_filled;
}

function agent_total_profit(agent) {
    var profit = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	if(company_has_filled_job_positions(agent , company)){
	    profit += company_profit(agent, company);
	}
    });
    return profit;
}

function agent_total_wages(agent) {
    var wages = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	if(company_has_filled_job_positions(agent , company)){
	    wages += company.jobs_filled * company.provided_wage;
	}
    });
    return wages;
}


function agent_total_produced_value(agent) {
    var value = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	if(company_has_filled_job_positions(agent , company)){
	    value += company.units_sold * company.product_price;
	}
    });
    return value;
}

function agent_total_production(agent) {
    var production = 0;
    Object.keys(agent.companies).forEach(function(id){
	var company = agent.companies[id];
	production += company.production;
    });
    return production;
}


// Since companies are non-empty, this will always return correct results.
function non_producing_company_exists(agent) {
    var keys = Object.keys(agent.companies)
    while(keys.length > 0) {
	var cid = keys.pop();
	var company = agent.companies[cid];
	if(company.production == 0){
	    return cid;
	}
    }
    return -1;
}


// Since companies are non-empty, this will always return correct results.
function agent_min_production(agent) {
    var production = 0;
    var id = 0;
    Object.keys(agent.companies).forEach(function(cid){
	var company = agent.companies[cid];
	if(production == 0){
	    production = company.production;
	    id = cid;
	} else {
	    if(production > company.production){
		production = company.production;
		id = cid;
	    }
	}
    });
    var result = {"production" : production , "id" : id};
    return result;
}


// It changes production solely on the total units sold and the
// production capacity of the companies.
function agent_change_production_level(agent) {
    var total_production = agent_total_production(agent);
    var total_units_sold = agent_total_units_sold(agent);
    var difference = total_production - total_units_sold;

    var unfunded = agent_unfunded_companies(agent);
    var some_unfunded = false;
    if(unfunded.length > 0) {
	some_unfunded = true;
    //Remove unfunded except one.
	unfunded.pop();
	unfunded.forEach(function(id){
	    delete agent.companies[id];
	});

    }

    // Increase production if there is need for more.
    if(difference == 0 && some_unfunded == false && non_producing_company_exists(agent) == -1) {
	var cmp = new Company;
	agent.companies[cmp.id] = cmp;
    } else {
	var min_production = agent_min_production(agent);
	while (difference > 0 && min_production.production < difference) {
	    delete agent.companies[min_production.id];
	    difference -= min_production.production;
	    min_production = agent_min_production(agent);
	}
    }
}

function fill_with_ids (na) {
    var output = [];
    for (var i = 0; i < na; i++) {
	output.push(i);
    }
    return output;
}

//picks random id an removes it from the list.
function pick_rand_id (ids) {
    var length = ids.length;
    var i = rand(length);
    var id = ids[i];
    ids.splice(i , 1);
    return id;
}

function perform_action(agents , action , par){
    var ids = fill_with_ids(agents.length);
    while(ids.length > 0) {
	var id = pick_rand_id(ids);
	var agent = agents[id];
	action(agent , agents , par);
    }
}

function Par(){
    this.nl = 10;
    this.na = 1000;
    this.money = 1000;
    this.op_chance = 10000;
    this.jobs_width = 100;
    this.output_width = 100;
    // Used in an exp. function to determine consumption.
    this.cons_exp = 1/3;
    //Unstable
    this.min_consumption = 0;
    this.taxation_rate = 0;
    
}

function Environment(){
    this.par = new Par();
    this.agents = [];
    for (var i = 0; i < this.par.na; i++) {
	this.agents.push(new Agent(i , this.par.money , this.par.nl , this.par.na));
    }
    this.total_production = 0;
    this.total_sales = 0;
    this.average_price = 0;
    this.average_wage = 0;
    this.employment = 0;
    this.average_loan_rate = 0;
    this.total_lent_money = 0;
    this.companies = 0;
    this.average_profit = 0;
    this.total_money = this.par.na * this.par.money;
    this.profit_distr = compute_profit_distr(this.agents);
    this.money_distr = compute_money_distr(this.agents);
    this.company_productivity_distr = compute_company_productivity_distr(this.agents);
    this.company_size_distr = compute_company_size_distr(this.agents);
    this.company_worker_size_distr = compute_company_worker_size_distr(this.agents);
}

function taxation(agents , taxation_rate) {
    if(taxation_rate == 0) {
	return 0;
    }
    var money = 0;
    agents.forEach(function(agent){
	var taxes = Math.floor (agent.money * (taxation_rate / 100));
	agent.money = agent.money - taxes;
	money = money + taxes;
    });
    return money;
}

function redistribution(agents , taxes) {
    if(taxes == 0) {
	return;
    }
    var amount = Math.floor (taxes / agents.length);
    if (amount * agents.length != taxes) {
	var id = rand(agents.length);
	agents[id].money += taxes - amount * agents.length;
    }
    agents.forEach(function(agent){
	agent.money = agent.money + amount;
    });
}


function compute_total_production(agents) {
    var production = 0;
    agents.forEach(function(agent){
	production = production + agent_total_production(agent);
    });
    return production;
}


function compute_total_lent_money(agents) {
    var lent_money = 0;
    agents.forEach(function(agent){
	var m = 0;
	agent.debts.forEach(function(debt){
	    m = m + debt.amount;
	});

	lent_money = lent_money + m;
    });
    return lent_money;
}

function compute_average_loan_rate(agents , lent_money, prev_rate) {
    if(lent_money == 0){
	return prev_rate;
    }
    var rate = 0;
    agents.forEach(function(agent){
	var m = 0;
	agent.debts.forEach(function(debt){
	    m = m + debt.amount * debt.loan_rate;
	});

	rate = rate + m;
    });
    return rate / lent_money;
}

function compute_total_sales(agents) {
    var sales = 0;
    agents.forEach(function(agent){
	sales = sales + agent_total_units_sold(agent);
    });
    return sales;
}

function compute_employment(agents) {
    var n = 0;
    agents.forEach(function(agent){
	n = n + agent_total_jobs_filled(agent);
    });
    return n;
}

function compute_total_profit(agents) {
    var profit = 0;
    agents.forEach(function(agent){
    	profit += agent_total_profit(agent);
    });
    return profit;
}

function compute_average_wage(agents , employment , prev_wage) {
    if(employment == 0){
	return prev_wage;
    }
    var wage = 0;
    agents.forEach(function(agent){
	wage += agent_total_wages(agent);
    });
    return wage / employment;
}


function compute_average_price(agents , total_sales , prev_price) {
    if(total_sales == 0){
	return prev_price;
    }
    var value = 0;
    agents.forEach(function(agent){
	value += agent_total_produced_value(agent);
    });
    return value / total_sales;
}

function compute_total_money(agents) {
    var money = 0;
    agents.forEach(function(agent){
	money = money + agent.money;
    });
    return money;
}

// I think that here , we need to identify each company to all the companies of a single agent.
function compute_number_of_companies(agents) {
    var companies = 0;
    agents.forEach(function(agent){
	if(agent_has_filled_job_positions(agent)){
	    companies++;
	}
    });
    return companies;
}

// f must preserve order.
function generate_distr(distr , f , g) {
    var keys = Object.keys(distr).map(each => parseInt(each));
    keys.sort(function(a , b) {
	if(b > a) {
	    return -1;}
	if(b < a) {
	    return 1;}
	return 0;
    });
    
    var points = [];
    for(var i = 0 ; i < keys.length;  i++){
	var key = keys[i];
	points.push(new Point(f(key) , g (distr[key])));
	if(i + 1 < keys.length) {
	    var nkey = keys[i + 1];
	    var j = 1;
	    while(nkey > key + j) {
		points.push(new Point(f(key + j) , g(0))) ;
		j++;
	    }
	}
    }
    return points;
}

function identity(x){
    return x;
}

function compute_company_size_distr(agents) {
    var distr = {};
    agents.forEach(function(agent){
	var size = 0;
        Object.keys(agent.companies).forEach(function(key) {
	    var company = agent.companies[key];
	    if(company_has_filled_job_positions(agent, company)){
		size++
	    }
	});
	if(distr[size] === undefined){
	    distr[size] = 0;
	}
	distr[size]++;
    });
    delete distr[0];
    return generate_distr(distr , identity , identity);
}


function compute_company_worker_size_distr(agents) {
    var distr = {};
    agents.forEach(function(agent){
	var size = 0;
        Object.keys(agent.companies).forEach(function(key) {
	    var company = agent.companies[key];
	    if(company_has_filled_job_positions(agent, company)){
		size += agent.opportunities[company.op_id].jobs;
	    }
	});
	if(distr[size] === undefined){
	    distr[size] = 0;
	}
	distr[size]++;
    });
    delete distr[0];
    return generate_distr(distr , identity , identity);
}

function compute_company_productivity_distr(agents) {
    var distr = {};
    agents.forEach(function(agent){
        Object.keys(agent.companies).forEach(function(key) {
	    var company = agent.companies[key];
	    if(company_has_filled_job_positions(agent, company)){
		var op = agent.opportunities[company.op_id];
		var prod = Math.floor(op.output / op.jobs);
		if(distr[prod] === undefined){
		    distr[prod] = 0;
		}
		distr[prod]++;
	    }
	});
    });

    return generate_distr(distr , identity , identity);
}




function compute_average_profit(agents , companies , average_price) {
    if(companies == 0 || average_price == 0){
	return 0;
    }
    return compute_total_profit(agents) / (companies * average_price);
}

function compute_profit_distr(agents){
    var distr = {};
    agents.forEach(function(agent){
	if(agent_has_filled_job_positions(agent)) {
	    var position;
	    var profit = agent_total_profit(agent);
	    if(profit > 0){
		position = Math.floor (Math.log(profit));
	    } else {
		position = - Math.floor (Math.log(- profit + 1));
	    }
	    //console.log(position);
	    //console.log(agent);
	    if(distr[position] === undefined){
		distr[position] = 0;
	    }
	    distr[position]++;
	}
    });

    return generate_distr(distr , identity , function(x) {return Math.log(x + 1)});
}


function compute_money_distr(agents){
    var distr = {};
    agents.forEach(function(agent){
	var position = Math.floor (Math.log(agent.money + 1));
	if(distr[position] === undefined){
	    distr[position] = 0;
	}
	distr[position]++;
    });

    return generate_distr(distr , identity , function(x) {return Math.log(x + 1)});
}



function equation(t, env) {
    perform_action(env.agents , agent_learn_opportunity , env.par);
    perform_action(env.agents , agent_learn_loan_rates , env.par);
    perform_action(env.agents , agent_fund_companies , env.par);
    perform_action(env.agents , agent_fund_companies_with_loan , env.par);
    perform_action(env.agents , agent_learn_workplaces , env.par);
    perform_action(env.agents , agent_pick_workplace , env.par);
    relocate_workers(env.agents , env.par);
    perform_action(env.agents , agent_produce , env.par);
    perform_action(env.agents , agent_learn_products , env.par);
    perform_action(env.agents , agent_consume , env.par);

    if(time + 1 >=  sample_rate + prev_time) {
	env.total_production = compute_total_production(env.agents);
	env.total_sales = compute_total_sales(env.agents);
	env.employment = compute_employment(env.agents);
	env.companies = compute_number_of_companies(env.agents);
	env.profit_distr = compute_profit_distr(env.agents);
	env.money_distr = compute_money_distr(env.agents);
	env.company_productivity_distr = compute_company_productivity_distr(env.agents);
	env.company_size_distr = compute_company_size_distr(env.agents);
	env.company_worker_size_distr = compute_company_worker_size_distr(env.agents);
	env.total_lent_money = compute_total_lent_money(env.agents);
	env.average_price = compute_average_price(env.agents , env.total_sales , env.average_price);
	env.average_profit = compute_average_profit(env.agents, env.companies , env.average_price);
	env.average_wage = compute_average_wage(env.agents , env.employment , env.average_wage);
	env.average_loan_rate = compute_average_loan_rate(env.agents , env.total_lent_money , env.average_loan_rate);
    }

    var taxes = taxation(env.agents ,env.par.taxation_rate);
    redistribution(env.agents , taxes);
    
    perform_action(env.agents , agent_pay_debt , env.par);
    perform_action(env.agents , agent_adapt_prices , env.par);
    perform_action(env.agents , agent_adapt_loan_rate , env.par);
    perform_action(env.agents , agent_change_production_level , env.par);
    perform_action(env.agents , agent_after_adapt , env.par);


    assert(env.total_sales <= env.total_production , "The total sales should be smaller that total production.");
    var total_money = compute_total_money(env.agents);
    assert(total_money == env.total_money , "The total amount of money has changed.");
  //  env.total_money = compute_total_money(env.agents);
}

function Dchart(env) {
    this.profit_distr = env.profit_distr;
    this.money_distr = env.money_distr;
    this.company_productivity_distr = env.company_productivity_distr;
    this.company_size_distr = env.company_size_distr;
    this.company_worker_size_distr = env.company_worker_size_distr;
}

function Result(env) {
    this.total_production = env.total_production;
    this.total_sales = env.total_sales;
    this.average_price = env.average_price;
    this.employment = env.employment;
    this.average_wage = env.average_wage;
    this.total_lent_money = env.total_lent_money;
    this.average_loan_rate = env.average_loan_rate;
    this.companies = env.companies;
    this.average_profit = env.average_profit;
    this.dcharts = new Dchart(env);
   // this.total_money = total_money_;
}

var time;
var prev_time;
var env;
var sample_rate;

onmessage = function(e) {
    if(e.data.option == 'more') {
        while (time < sample_rate + prev_time) {
            equation(time, env);
            time++;
        }
	prev_time = sample_rate + prev_time;

	postMessage(new Result(env)); // , env.total_money));
    }
    if(e.data.option == 'reset') {
	time = 0;
	prev_time = 0;
	env = new Environment();
    }
    if(e.data.option == 'start') {
	time = 0;
	prev_time = 0;
	env = new Environment();
	sample_rate = e.data.sample_rate;
    }


}
