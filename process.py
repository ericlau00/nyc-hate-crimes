import csv 
import json 
import datetime

domain = [
        'ANTI-JEWISH',
        'ANTI-LGBTQ+',
        'ANTI-BLACK',
        'ANTI-WHITE',
        'ANTI-ASIAN',
        'ANTI-ISLAMIC(MUSLIM)',
        'ANTI-CATHOLIC',
        'ANTI-OTHER ETHNICITY',
        'OTHER',
        'ANTI-ARAB',
        'ANTI-HISPANIC',
        'ANTI-MULTI RACIAL GROUPS'
    ]

lgbtMotives = [
        "ANTI-MALE HOMOSEXUAL(GAY)",
        "ANTI-FEMALE HOMOSEXUAL(GAY)",
        "ANTI-TRANSGENDER",
        "ANTI-LGBT(MIXED GROUP)"
    ]

motives = dict()

dates = list()

begin = datetime.datetime(2019, 1, 1)
current = datetime.datetime(2019, 1, 1)
end = datetime.datetime(2020, 10, 1)
delta = datetime.timedelta(days=1)

while current < end:
    dates.append(current.strftime('%Y-%m-%d'))
    current += delta

for m in domain:
    motives[m] = {
        'name': m,
        'values': [0 for i in range(len(dates))]
    }

with open('data/NYPD_Hate_Crimes.csv') as file:
    reader = csv.DictReader(file)
    for row in reader:

        motive = row['Bias Motive Description']
        if motive in lgbtMotives:
            motive = "ANTI-LGBTQ+"
        if motive not in domain:
            motive = "OTHER"

        recordDate = row['Record Create Date']
        date = datetime.datetime.strptime(recordDate, '%m/%d/%Y')
        index = int((date - begin) / delta)

        motives[motive]['values'][index] += 1

data = {
    'y': '# hate crimes',
    'series': motives,
    'dates': dates
}

with open('data/time.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)