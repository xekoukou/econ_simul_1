function assert(b , msg) {
    if(!b) {
	throw msg || "Assertion Failed"
    }
}
function rand(width) {
    return Math.floor(Math.random() * width);
}

function rand_except(width , id) {
    var nid;
    do {
	nid = Math.floor(Math.random() * width);
    } while (nid == id)
    return nid;
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

function Dept(id , amount , loan_rate) {
    this.id = id;
    this.amount = amount;
    this.loan_rate = loan_rate;
}


function Agent(id , money , nl , na) {
    // the amount of memory
    this.nl = nl;
    this.id = id;
    // the amount of money
    this.money = money;
    this.prev_prod_profit = 0;
    this.prev_loan_profit = 0;
    this.average_consumer_price = 0;
    this.debts = [];
    // The amount of money he has lent to others.
    // This is to be set to zero every turn before new lending happens because we use it to
    // find the loan profitability with the current loan_rate.
    this.lent_money = 0;
    this.loans = [];
    this.prev_price_higher = -1;
    this.prev_loan_rate_higher = 0;
    // Ids of the agents that own the company.
    this.known_products = [];
    this.known_workplaces = [];
    this.known_loan_rates = [];

    // The order here is important for company_id.
    this.opportunities = [] ;
    for (var i = 0; i < nl; i++) {
	this.opportunities.push(new Opportunity(1 , 4));
    }
    this.company_id = 0;
    this.changed_op = 0;
    this.provided_wage = 5;
    this.product_price = 2;
    this.loan_rate = 1;
    this.production = 0;
    this.jobs_filled = 0;
    this.workers = [];
    this.units_sold = 0;
    this.company_funded = 0;
}

function agent_has_produced(agent) {
    var op = agent.opportunities[agent.company_id];
    if(agent.company_funded == 1 && agent.jobs_filled == op.jobs){
	return true;
    }
    return false;
}

function agent_the_profit(agent) {
    var op = agent.opportunities[agent.company_id];
    return op.output * agent.product_price - op.jobs * agent.provided_wage;  
}

function agent_profit(agent) {
    return agent.units_sold * agent.product_price - agent.jobs_filled * agent.provided_wage;
}

function agent_adapt(agent) {
    var op = agent.opportunities[agent.company_id];
    var th_profit = agent_the_profit(agent);

    // Not funded means that the agent does not have any money to fund it.
    //Reduce wages.
    if(agent.company_funded == 0 && agent.provided_wage > 1){
	agent.provided_wage--;
    }

    if(agent.company_funded == 1) {
	
	// If there is a theoretical profit , but not enough workers , increase wage.
	if((th_profit - agent.jobs_filled > 0) && (agent.jobs_filled < op.jobs)) {
	    agent.provided_wage++;
	}
	
	if(agent.jobs_filled == op.jobs) {
	    var	re_profit = agent_profit(agent);

	    if(agent.prev_price_higher == -1 || agent.changed_op == 1){
		if(rand(2) && agent.product_price > 1){
		    agent.product_price--;
		    agent.prev_price_higher = 1;
		} else {
		    agent.product_price++;
		    agent.prev_price_higher = 0;
		}
	    } else {
		
		if (re_profit > agent.prev_prod_profit) {
		    if (agent.prev_price_higher == 1) {
			if(agent.product_price > 1){
			    agent.product_price--;
			} else {
			    agent.prev_price_higher = -1;
			}
		    } else {
			agent.product_price++;
		    }
		}
		if (re_profit <= agent.prev_prod_profit) {
		    if (agent.prev_price_higher == 1) {
			agent.product_price++;
			agent.prev_price_higher = 0;
		    } else {
			if(agent.product_price > 1){
			    agent.product_price--;
			    agent.prev_price_higher = 1;
			} else {
			    agent.prev_price_higher = -1;
			}
		    }
		}

		if(rand(2)) {
		    // Reduce the wage
		    if(agent.provided_wage > 1) {
			agent.provided_wage--;
			agent.prev_price_higher = -1;
		    }
		}
	    }
	    // Update the previous profit variable.
	    agent.prev_prod_profit = re_profit;
	}
    } else {
	agent.prev_prod_profit = 0;
    }

    // Interest rate policy
    var loan_profit = agent.lent_money * agent.loan_rate / 100;
    if(agent.prev_loan_profit < loan_profit) {
	if(agent.prev_loan_rate_higher == 1) {
	    if(agent.loan_rate > 1){
		agent.loan_rate--;
	    }
	} else {
	    agent.loan_rate++;
	}
    } else {
	if(agent.prev_loan_rate_higher == 1) {
	    agent.loan_rate++;
	    agent.prev_loan_rate_higher = 0;
	} else {
	    if(agent.loan_rate > 1){
		agent.loan_rate--;
		agent.prev_loan_rate_higher = 1;
	    }
	}
    }
    agent.prev_loan_profit = loan_profit;
}

// probability of new opportunity is 1 / op_change
function agent_learn_opportunity(agent , agents , par) {
    if(rand(par.op_chance) == 0) {
	var nop = new Opportunity(par.jobs_width , par.output_width);

        // Add the current company as is.
	var nops = [];
	nops.push(agent.opportunities[agent.company_id]);
	agent.opportunities.splice(agent.company_id , 1);
	agent.company_id = 0;
        // Find the best other opportunities.
	agent.opportunities.push(nop);
	for(var i = 0 ; i < agent.nl - 1; i++){
	    var id = agent_find_best_opportunity(agent, []);
	    nops.push(agent.opportunities[id]);
	    agent.opportunities.splice(id , 1);
	}
	agent.opportunities = nops;
    }
}

function agent_learn_workplaces(agent , agents , par) {
    agent.known_workplaces = [];
    for(var j = 0; j < agent.nl; j++) {
	var nw = -1;
	var nag;
	var q = 1000;
	do {
	    q--;
	    if(q < 0) {
		break;
	    }
	    nw = rand_except(par.na , agent.id);
	    nag = agents[nw];
	} while (nag.company_funded == 0 || !different_from_all(nw , agent.known_workplaces))
	if(nw != -1) {
	    agent.known_workplaces.push(nw);
	}
    }
}


function agent_learn_products(agent , agents , par) {
    var price = 0;
    var times = 0;
    agent.known_products = [];
    for(var j = 0; j < agent.nl; j++) {
	var np = -1;
	var  nagp;
	var q = 1000;
	do {
	    q--;
	    if(q < 0) {
		    break;
	    }
	    np = rand_except(par.na , agent.id);
	    nagp = agents[np];
	} while (!agent_has_produced(nagp) || !different_from_all(np , agent.known_products))
	if(np != -1) {
	    times++;
	    price += agents[np].product_price;
	    agent.known_products.push(np);
	}
    }
    agent.average_consumer_price = price / times;
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
	    var nop = nagr.opportunities[nagr.company_id]
	    nmin_money = par.min_money_multi * (nop.jobs * nagr.provided_wage);
	} while (nagr.money >  nmin_money || !different_from_all(nr , agent.known_loan_rates))
	if(nr != -1) {
	    agent.known_loan_rates.push(nr);
	}
    }
}



function agent_find_cheapest (agent , agents) {
    var id = agent.known_products[0];
    var price = agents[id].product_price;
    var available = agents[id].production - agents[id].units_sold;

    for (var i = 1; i < agent.known_products.length ; i++) {
	var nid = agent.known_products[i];
	var nprice = agents[nid].product_price;
	var navailable = agents[nid].production - agents[nid].units_sold;
	if ((nprice <= price && navailable > 0) || available <= 0) {
	    id = nid;
	    price = nprice;
            available = navailable;
	}
    }
    if(available > 0) {
	return id;
    } else {
	return -1;
    }
}

function agent_consume(agent , agents , par) {
    var con = rand(par.cwidth);
    while((agent.money > 0) && (con > 0)) {
	con--;
	var id = agent_find_cheapest(agent , agents);
	if (id == -1) {
	    return;
	} else {
	    var seller = agents[id];
	    if(agent.money < seller.product_price) {
		return;
	    } else {
		agent.money = agent.money - seller.product_price;
		assert(agent.money >= 0 , "Consumer money should ne non negative.");
		seller.money = seller.money + seller.product_price;
		seller.units_sold++;
		assert(seller.production - seller.units_sold >= 0 , "Units sold should fewer than production.");
	    }
	}
    }
}

// This is based on the current perception of wages and product prices of the agent.
// Thus the best option depends on the market.
function agent_find_best_opportunity(agent , rejected) {
    var price = agent.product_price;
    var wage = agent.provided_wage;
    var op =  agent.opportunities[agent.company_id];
    var id = 0;
    var the_profit = op.output * price - op.jobs * wage;
    for (var i = 0; i < agent.opportunities.length; i++) {
	var nop = agent.opportunities[i];
	var nprofit = nop.output * price - nop.jobs * wage;
	if ((nprofit > the_profit) && (undefined === rejected.find(function(el) {el == i}))) {
	    op = nop;
	    the_profit = nprofit;
	    id = i;
	}
    }
    return id;
}


// The multiplier is used so as to avoid halting the operation of the company by lending money to others.
// Of course , the op might change for the lender, but at least, he can fund the current one.
function agent_find_lower_rate (agent , money_needed , agents , min_money_multi) {
    var id = agent.known_loan_rates[0];
    var rate = agents[id].loan_rate;
    for (var i = 1; i < agent.known_loan_rates.length ; i++) {
	var nid = agent.known_loan_rates[i];
	var nrate = agents[nid].loan_rate;
	var nop = agents[nid].opportunities[agents[nid].company_id]
	var min_money = min_money_multi * (nop.jobs * agents[nid].provided_wage);
	if ((nrate < rate) && (agents[nid].money - min_money - money_needed > 0)) {
	    id = nid;
	    rate = nrate;
	}
    }
    var op = agents[id].opportunities[agents[id].company_id]
    var min_money = min_money_multi * (op.jobs * agents[id].provided_wage);
    if(agents[id].money - min_money - money_needed > 0) {
	return id;
    } else {
	return -1;
    }
}


// Here I assume that the lenders give money to everyone that is asking,
// and that the borrower will pay eveentually all his debt, no defaults are possible.
// This is to simplify the model.
function agent_fund_company(agent , agents , par) {
    agent.company_funded = 0;
    agent.changed_op = 0;
    if(agent.debts.length > 0) {
	return;
    }
    var company_id = agent.company_id;

    var rejected = [];
    do {
	var op_id = agent_find_best_opportunity(agent , rejected);
	var op = agent.opportunities[op_id];
	var req = op.jobs * agent.provided_wage;
	if(agent.money >= req) {
	    agent.company_id = op_id;
	    agent.company_funded = 1;
	    if(op_id != company_id){
		agent.changed_op = 1;
	    }
	} else {
	    var rem = req - agent.money;
	    var lid = agent_find_lower_rate (agent , rem , agents , par.min_money_multi);
	    if(lid != -1) {
		var lender = agents[lid];
		var loan = Math.floor((lender.loan_rate + 100) * rem / 100);
		if(agent_the_profit(agent) - loan > 0) {
		    agent.company_id = op_id;
		    agent.company_funded = 1;
		    agent.money = agent.money + rem;
		    agent.debts.push(new Dept(lid , rem , lender.loan_rate));
		    lender.money = lender.money - rem;
		    assert(lender.money >= 0 , "Lender money non negative");
		    lender.lent_money = lender.lent_money + rem;
		    if(lender.company_funded == 1) {
			assert(lender.money > lender.opportunities[lender.company_id].jobs * lender.provided_wage , "Lender gave more money that he could.")
		    }
		    if(op_id != company_id){
			agent.changed_op = 1;
		    }
		}
	    }
	}
	rejected.push(op_id);
    } while ((agent.company_funded == 0) && (rejected.length < agent.opportunities.length)) ;
}

// This should be done after consumption.
//agent.lent_money is set to zero in every cycle.
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

function agent_pick_workplace(agent , agents , par) {
    assert(agent.jobs_filled == agent.workers.length , "The workers must equal the jobs filled." + agent.jobs_filled + " " + agent.workers.length);
    var id = agent.known_workplaces[0];
    var wage = agents[id].provided_wage;
    for (var i = 1; i < agent.known_workplaces.length ; i++) {
	var nid = agent.known_workplaces[i];
	var employer = agents[nid];
	var nwage = employer.provided_wage;
	var available_jobs = employer.opportunities[employer.company_id].jobs - employer.jobs_filled;
	if ((nwage < wage) && (employer.company_funded == 1) && (available_jobs > 0)) {
	    id = nid;
	    wage = nwage;
	}
    }
    var employer = agents[id];
    var available_jobs = employer.opportunities[employer.company_id].jobs - employer.jobs_filled;
    var min_wage = par.min_consumption * agent.average_consumer_price;
    if((employer.company_funded == 1) && (available_jobs > 0) && (employer.provided_wage > min_wage)) {
	employer.jobs_filled++;
	employer.workers.push(agent.id);
    }
}

function agent_pay_workers(agent , agents) {
    assert(agent.jobs_filled == agent.workers.length , "The number of jobs filled is not equal to the number of workers employed");
    while(agent.workers.length > 0) {
	assert(agent.company_funded == 1 , "To have workers, you must be funded.");
	var worker = agents[agent.workers.pop()];
	worker.money = worker.money + agent.provided_wage;
	agent.money = agent.money - agent.provided_wage;
	assert(agent.money >= 0 , "Employer money should be non negative");
    }
}
function agent_produce(agent , agents) {
    var op = agent.opportunities[agent.company_id];
    if((agent.company_funded == 1) && (agent.jobs_filled == op.jobs)) {
	agent.production = op.output;
	agent_pay_workers(agent , agents);
    }
}

// This needs to be done after adaptation and after production, cosmuption.
function agent_after_adapt(agent , agents) {
    agent.units_sold = 0;
    agent.lent_money = 0;
    agent.production = 0;
    agent.jobs_filled = 0;
    agent.workers = [];
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
    this.money = 10000;
    this.op_chance = 1000;
    this.jobs_width = 10;
    this.output_width = 20;
    this.cwidth = 1000;
    //required to replenish labor power.
    //It is used when looking for work.
    this.min_consumption = 2;
    this.min_money_multi = 5;
    this.taxation_rate = 50;
    
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
    this.average_profitaverage_profit = 0;
    this.total_money = this.par.na * this.par.money;
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
	production = production + agent.production;
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
	sales = sales + agent.units_sold;
    });
    return sales;
}

function compute_employment(agents) {
    var n = 0;
    agents.forEach(function(agent){
	if(agent_has_produced(agent)) {
	    n = n + agent.jobs_filled;
	}
    });
    return n;
}

function compute_average_profit(agents) {
    var profit = 0;
    agents.forEach(function(agent){
	if(agent_has_produced(agent)) {
	    profit = profit + agent_profit(agent)
	}
    });
}
function compute_average_wage(agents , employment , prev_wage) {
    if(employment == 0){
	return prev_wage;
    }
    var wage = 0;
    agents.forEach(function(agent){
	if(agent_has_produced(agent)) {
	    wage = wage + agent.jobs_filled * agent.provided_wage;
	}
    });
    return wage / employment;
}


function compute_average_price(agents , total_sales , prev_price) {
    if(total_sales == 0){
	return prev_price;
    }
    var price = 0;
    agents.forEach(function(agent){
	price = price + agent.units_sold * agent.product_price;
    });
    return price / total_sales;
}

function compute_total_money(agents) {
    var money = 0;
    agents.forEach(function(agent){
	money = money + agent.money;
    });
    return money;
}


function compute_number_of_companies(agents) {
    var companies = 0;
    agents.forEach(function(agent){
	if(agent_has_produced(agent)){
	    companies++;
	}
    });
    return companies;
}


function compute_average_profit(agents , companies) {
    if(companies == 0){
	return 0;
    }

    var profit = 0;
    agents.forEach(function(agent){
	if(agent_has_produced(agent)){
	    profit = profit + agent_profit(agent);
	}
    });
    return profit / companies;
}

function equation(t, env) {
    perform_action(env.agents , agent_learn_opportunity , env.par);
    perform_action(env.agents , agent_learn_loan_rates , env.par);
    perform_action(env.agents , agent_fund_company , env.par);
    perform_action(env.agents , agent_learn_workplaces , env.par);
    perform_action(env.agents , agent_pick_workplace , env.par);
    perform_action(env.agents , agent_produce , env.par);
    perform_action(env.agents , agent_learn_products , env.par);
    perform_action(env.agents , agent_consume , env.par);

    env.total_production = compute_total_production(env.agents);
    env.total_sales = compute_total_sales(env.agents);
    env.employment = compute_employment(env.agents);
    env.companies = compute_number_of_companies(env.agents);
    env.average_profit = compute_average_profit(env.agents, env.companies);
    env.total_lent_money = compute_total_lent_money(env.agents);
    env.average_price = compute_average_price(env.agents , env.total_sales , env.average_price);
    env.average_wage = compute_average_wage(env.agents , env.employment , env.average_wage);
    env.average_loan_rate = compute_average_loan_rate(env.agents , env.total_lent_money , env.average_loan_rate);


    var taxes = taxation(env.agents ,env.par.taxation_rate);
    redistribution(env.agents , taxes);
    
    perform_action(env.agents , agent_pay_debt , env.par);
    perform_action(env.agents , agent_adapt , env.par);
    perform_action(env.agents , agent_after_adapt , env.par);


    assert(env.total_sales <= env.total_production , "The total sales should be smaller that total production.");
    var b = compute_total_money(env.agents);
    assert(compute_total_money(env.agents) == env.total_money , "The total amount of money has changed.");
  //  env.total_money = compute_total_money(env.agents);
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
