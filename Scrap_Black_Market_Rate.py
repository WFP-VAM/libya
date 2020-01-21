
"""This script scraps the daily USD to LYD black market exchange.

The daily rate is taken from Ewan Libya news page.
It loops over the daily posts and identifies the USD/LYD rate is the articke
through a series of checks.
The data is saved into a csv file and creates an HTML page with a
time-series line plot of the data.

This script can be automated so that the HTML page is pushed to a web-server on
a daily basis.
"""

import requests
from bs4 import BeautifulSoup
import datetime
import re
import pandas as pd
import plotly.graph_objs as go
from plotly.offline import init_notebook_mode, plot

base = datetime.datetime.today()
print("Today: ", base)

# Check data already collected, if no data, collect 1 full year
try:
    Old_data = pd.read_csv('Black_Market_Exchange_Rate_ewanlibya.csv', index_col=0, parse_dates=True, infer_datetime_format=True)
    last_day = Old_data.index[0]
    print("Last day of data: ", last_day)
    n_days = (base - pd.to_datetime(last_day)).days
except FileNotFoundError:
    n_days = 365
    Old_data = pd.DataFrame([], columns=["Exchange Rate"])

print("Number of new days: ", n_days)

# Check data already collected, if no data, collect 1 full year

if n_days > 0:
    date_list = [(base - datetime.timedelta(days=x)).strftime("%Y-%m-%d") for x in range(0, n_days)]

    economy_links = ['http://ewanlibya.ly/news/category.aspx?id=10']
    pages = int(n_days / 20) + 3
    for n in range(1, pages):
        economy_links.append('http://ewanlibya.ly/news/category.aspx?id=10&cp=' + str(n))

    # Scrap list of links through the pages of the 'Economic' section of Ewan Libya
    date_url_dic = {}
    cnt = 0
    for url in economy_links:
        cnt += 1
        print("Finding all links in Econnomic page:", cnt)
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        all_links = soup.find_all('a', {'class': 'news-link', 'href': True})
        for x in date_list:
            for y in all_links:
                date = y.find('time')['datetime']
                if x in date and "السوق الموازي" in y.text:
                    date_url_dic[x] = [y['href'], url]
                    break

    missing_dates = set(date_list) - set(date_url_dic.keys())
    print("Missing days in current download: ", len(missing_dates))

    # Scrap through each link and find the USD/LYD exchange rate
    prices = {}
    for x in date_url_dic:
        url = date_url_dic[x][0]
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        try:
            paragraphs = soup.find('table').find_all('tr')  # Recent data is displayed in a table
        except(AttributeError):
            paragraphs = soup.find('article', attrs={'id': 'NewsPage'}).find_all('p')  # Old data is in the text of an article
        n_paragraphs = len(paragraphs)
        for y in range(n_paragraphs):
            text = paragraphs[y].text
            if ("الدولار الأمريكي" in text) or ("الدولار الامريكى" in text) or ("الدولار الامريكي" in text):  # Different spellings of "US Dollars"
                if re.findall("\d+\.\d+", text):
                    price = re.findall("\d+\.\d+", text)[0]
                    break
            elif ("الدولار" in text):  # Spelling of "Dollars". Be careful, could be the Canadian dollar
                if re.findall("\d+\.\d+", text):
                    price = re.findall("\d+\.\d+", text)[0]
                    break
            elif y == (n_paragraphs - 1):  # If the loop has been through all paragraphs and did not find the word "dollar"
                print("No price found in page", x, date_url_dic[x])
        price = float(price)
        if (price > 2) and (price < 11):  # Check if price in reasonable range. There could be a decimal mistake
            prices[x] = price
            print(x, price)
        else:
            print("Price out of range", x, url, price)

    ER = pd.DataFrame.from_dict(prices, orient='index', columns=["Exchange Rate"])

    New_ER = ER.append(Old_data)
    New_ER.index = pd.to_datetime(New_ER.index)

    New_ER_sorted = New_ER.sort_index()
    New_ER.to_csv('Black_Market_Exchange_Rate_ewanlibya.csv')

    # Interactive Plot with Plotly
    init_notebook_mode(connected=True)

    today = base
    last_year = base - pd.DateOffset(years=1)
    ER1year = New_ER[(New_ER.index > last_year) & (New_ER.index <= today)]
    ER1year = ER1year.sort_index()
    ER1year.to_csv('Black_Market_Exchange_Rate_ewanlibya_1year.csv')
    data = [go.Scatter(x=ER1year.index, y=ER1year["Exchange Rate"])]
    layout = go.Layout(title='<b>Libyan Dinar - LYD/USD Parallel Exchange Rate</b> <br><br> Source: Ewan Libya',
                       xaxis=dict(title='Date'),
                       yaxis=dict(title='(LYD/USD)'))
    fig = go.Figure(data, layout=layout)

    ER_div = plot(fig, include_plotlyjs=False, output_type='div')
    ER_div = BeautifulSoup('<div class="graph" id="ER">' + ER_div[5:], 'html.parser')
    with open("template_ER.html") as html:
        soup = BeautifulSoup(html.read(), features="lxml")
        soup.find("div", {"id": "ER"}).replace_with(ER_div)

    # save the file
    with open("exchange_rate_LYD_USD.html", "w") as outf:
        outf.write(str(soup))

    print("Completed")
